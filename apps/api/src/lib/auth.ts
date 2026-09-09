import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
};

const PLACEHOLDER_SECRETS = new Set(['change-me-in-production', 'local-dev-auth-secret-change-me']);
const MINIMUM_SECRET_LENGTH = 16;

const AUTH_SECRET = resolveAuthSecret();

/**
 * Tokens are only as trustworthy as the secret signing them, so a missing or
 * placeholder value must stop the process instead of silently falling back to
 * a value that is public in the source tree.
 */
function resolveAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    throw new Error(
      'AUTH_SECRET is not set. Copy .env.example to .env and set a long random value before starting the API.'
    );
  }

  if (PLACEHOLDER_SECRETS.has(secret)) {
    const message = `AUTH_SECRET still uses the placeholder value from .env.example. Replace it with a long random value.`;

    if (isProduction) {
      throw new Error(message);
    }

    console.warn(`[auth] ${message}`);
    return secret;
  }

  if (secret.length < MINIMUM_SECRET_LENGTH) {
    const message = `AUTH_SECRET must be at least ${MINIMUM_SECRET_LENGTH} characters long.`;

    if (isProduction) {
      throw new Error(message);
    }

    console.warn(`[auth] ${message}`);
  }

  return secret;
}

export function createAuthToken(user: AuthUser) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email
    },
    AUTH_SECRET,
    {
      expiresIn: '30d'
    }
  );
}

export function attachOptionalAuth(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, AUTH_SECRET) as { sub?: string; email?: string };

    if (payload.sub && payload.email) {
      request.authUser = {
        id: payload.sub,
        email: payload.email
      };
    }
  } catch {
    request.authUser = undefined;
  }

  next();
}