import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
};

const AUTH_SECRET = process.env.AUTH_SECRET ?? 'local-dev-auth-secret-change-me';

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