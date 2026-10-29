import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../auth/tokens.js';

export type AuthLocals = { userId: string };

/** Mount before protected handlers; the verified UUID is in res.locals.userId. */
export const requireAuth: RequestHandler<{}, unknown, unknown, {}, AuthLocals> = async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');

  if (!match) {
    res.set('WWW-Authenticate', 'Bearer');
    res.status(401).json({ message: 'A Bearer access token is required.' });
    return;
  }

  try {
    res.locals.userId = await verifyAccessToken(match[1]);
  } catch {
    res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
    res.status(401).json({ message: 'Access token is invalid or expired.' });
    return;
  }

  next();
};
