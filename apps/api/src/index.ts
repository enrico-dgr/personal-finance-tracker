import './lib/env.js';

import { compare, hash } from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';

import {
  buildFingerprint,
  classifyDescription,
  DEFAULT_CATEGORIES,
  listDefaultMerchantRules,
  type RulePatternType,
} from './domain/classification.js';
import { parseCsvTransactions } from './domain/csv.js';
import {
  attachOptionalAuth,
  createAuthToken,
  type AuthenticatedRequest,
} from './lib/auth.js';
// import { prisma } from './lib/prisma.js';
import { db as prisma } from './prisma/db.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
const port = Number(process.env.PORT ?? 3001);

const createRuleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  defaultRuleId: z.string().trim().min(1).optional().nullable(),
  pattern: z.string().trim().min(1),
  patternType: z.enum(['contains', 'regex']).optional().default('contains'),
  normalizedName: z.string().trim().min(1),
  category: z.enum(DEFAULT_CATEGORIES),
  priority: z.coerce.number().int().min(0).max(10000).optional().default(1000),
  isDisabled: z.boolean().optional().default(false),
});

const authSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8),
  syncLocalRules: z.array(createRuleSchema).optional().default([]),
});

const ruleSearchSchema = z.object({
  q: z.string().trim().optional().default(''),
});

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

/**
 * Credential endpoints are the only unauthenticated write surface, so they get
 * their own throttle to keep brute-force attempts expensive.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, the Vite dev proxy, same-origin
      // fetches) are not subject to CORS, so they pass through untouched.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
  })
);
app.use(express.json());
app.use(attachOptionalAuth);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/categories', (_request, response) => {
  response.json({ categories: DEFAULT_CATEGORIES });
});

app.get('/api/auth/me', async (request: AuthenticatedRequest, response) => {
  if (!request.authUser) {
    response.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const user = await prisma.orm.public.User.where({ id: request.authUser.id })
    .select('id', 'email', 'createdAt')
    .all();

  if (!user) {
    response.status(401).json({ message: 'User not found.' });
    return;
  }

  response.json({ user });
});

app.post('/api/auth/signup', authRateLimiter, async (request, response) => {
  const parsedBody = authSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ message: 'Invalid sign-up payload.' });
    return;
  }

  const { email, password, syncLocalRules } = parsedBody.data;
  const existingUser = await prisma.orm.public.User.where({
    email,
  }).all();

  if (existingUser.length > 0) {
    response
      .status(409)
      .json({ message: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.orm.public.User.create({
    email,
    passwordHash,
  });

  await syncRulesForUser(user.id, syncLocalRules);

  response.status(201).json({
    user,
    token: createAuthToken({ id: user.id, email: user.email }),
    rules: await listRulesForUser(user.id),
  });
});

app.post('/api/auth/login', authRateLimiter, async (request, response) => {
  const parsedBody = authSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ message: 'Invalid login payload.' });
    return;
  }

  const { email, password, syncLocalRules } = parsedBody.data;
  const user = await prisma.orm.public.User.where({ email }).all();

  if (user.length === 0) {
    response.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const passwordMatches = await compare(password, user[0].passwordHash);

  if (!passwordMatches) {
    response.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  await syncRulesForUser(user[0].id, syncLocalRules);

  response.json({
    user: {
      id: user[0].id,
      email: user[0].email,
      createdAt: user[0].createdAt,
    },
    token: createAuthToken({ id: user[0].id, email: user[0].email }),
    rules: await listRulesForUser(user[0].id),
  });
});

app.get('/api/rules', async (request: AuthenticatedRequest, response) => {
  if (!request.authUser) {
    response.json({ rules: [] });
    return;
  }

  const parsedQuery = ruleSearchSchema.safeParse(request.query);
  const search = parsedQuery.success ? parsedQuery.data.q.trim() : '';

  const rules = await prisma.orm.public.MerchantRule.where({
    userId: request.authUser.id,
    ...(search
      ? {
        OR: [
          { pattern: { contains: search } },
          { normalizedName: { contains: search } },
          { category: { contains: search } },
        ],
      }
      : {}),
  }).orderBy([m => m.updatedAt.desc(), m => m.createdAt.desc()]).all();

  response.json({ rules });
});

app.get('/api/rules/defaults', (_request, response) => {
  response.json({ rules: listDefaultMerchantRules() });
});

app.post('/api/rules', async (request: AuthenticatedRequest, response) => {
  if (!request.authUser) {
    response
      .status(401)
      .json({ message: 'Sign in to sync rules across devices.' });
    return;
  }

  const parsedBody = createRuleSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ message: 'Invalid merchant rule payload.' });
    return;
  }

  const rule = await upsertRule(request.authUser.id, parsedBody.data);
  response.status(201).json({ rule });
});

app.delete(
  '/api/rules/:id',
  async (request: AuthenticatedRequest, response) => {
    if (!request.authUser) {
      response.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const ruleId = String(request.params.id);

    const deletedRule = await prisma.orm.public.MerchantRule.where({
      id: ruleId,
      userId: request.authUser.id,
    }).delete();

    if (!deletedRule) {
      response.status(404).json({ message: 'Merchant rule not found.' });
      return;
    }

    response.status(204).send();
  }
);

app.post('/api/upload', upload.single('file'), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ message: 'CSV file is required.' });
    return;
  }

  const parsedRules = parseIncomingRules(request.body.rules);

  if (!parsedRules.success) {
    response
      .status(400)
      .json({ message: 'Invalid rule payload attached to upload.' });
    return;
  }

  const rows = parseCsvTransactions(request.file.buffer.toString('utf-8'));
  const now = new Date().toISOString();

  const transactions = rows.map((row, index) => {
    const classification = classifyDescription(
      row.originalDescription,
      parsedRules.data
    );
    const fingerprint = buildFingerprint(row);

    return {
      id: `${fingerprint}|${index}`,
      date: row.date.toISOString(),
      originalDescription: row.originalDescription,
      normalizedDescription: classification.normalizedDescription,
      amount: row.amount,
      category: classification.category,
      createdAt: now,
      updatedAt: now,
    };
  });

  response.status(201).json({
    importedRows: rows.length,
    createdCount: rows.length,
    updatedCount: 0,
    transactions,
  });
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(error);
    response.status(500).json({
      message:
        error instanceof Error ? error.message : 'Unexpected server error.',
    });
  }
);

function parseIncomingRules(rawRules: unknown) {
  if (typeof rawRules !== 'string' || rawRules.trim().length === 0) {
    return z.array(createRuleSchema).safeParse([]);
  }

  try {
    return z.array(createRuleSchema).safeParse(JSON.parse(rawRules));
  } catch {
    return z.array(createRuleSchema).safeParse(undefined);
  }
}

async function listRulesForUser(userId: string) {
  return prisma.orm.public.MerchantRule.where({
    userId,
  }).orderBy([
    (m) => m.priority.desc(),
    (m) => m.updatedAt.desc(),
    (m) => m.createdAt.desc(),
  ]);
}

async function syncRulesForUser(
  userId: string,
  rules: Array<{
    id?: string;
    defaultRuleId?: string | null;
    pattern: string;
    patternType: RulePatternType;
    normalizedName: string;
    category: string;
    priority: number;
    isDisabled?: boolean;
  }>
) {
  for (const rule of rules) {
    await upsertRule(userId, rule);
  }
}

async function upsertRule(
  userId: string,
  input: {
    id?: string;
    defaultRuleId?: string | null;
    pattern: string;
    patternType: RulePatternType;
    normalizedName: string;
    category: string;
    priority: number;
    isDisabled?: boolean;
  }
) {
  const existingRule = input.id
    ? await prisma.orm.public.MerchantRule.where({
      id: input.id,
      userId,
    }).first()
    : input.defaultRuleId
      ? await prisma.orm.public.MerchantRule.where({
        userId,
        defaultRuleId: input.defaultRuleId,
      }).first()
      : await prisma.orm.public.MerchantRule.where({
        userId,
        pattern: input.pattern,
        patternType: input.patternType,
        defaultRuleId: null,
      }).first();

  if (existingRule) {
    return prisma.orm.public.MerchantRule.where({ id: existingRule.id }).update(
      {
        pattern: input.pattern,
        patternType: input.patternType,
        normalizedName: input.normalizedName,
        category: input.category,
        priority: input.priority,
        isDisabled: Boolean(input.isDisabled),
        defaultRuleId: input.defaultRuleId ?? null,
      }
    );
  }

  return prisma.orm.public.MerchantRule.create({
    ...input,
    defaultRuleId: input.defaultRuleId ?? null,
    isDisabled: Boolean(input.isDisabled),
    userId,
  });
}

async function start() {
  await prisma.connect();

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

start().catch(async (error) => {
  console.error(error);
  await prisma.close();
  process.exit(1);
});
