import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { toUser } from '@uf-esports-hub/shared';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import type { AuthLocals } from '../../middleware/require-auth.js';

export const me: RequestHandler<{}, unknown, unknown, {}, AuthLocals> = async (_req, res) => {
  try {
    const [user] = await db.select().from(users)
      .where(eq(users.id, res.locals.userId)).limit(1);

    if (!user) {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      res.status(401).json({ message: 'User no longer exists.' });
      return;
    }

    res.json({ user: toUser(user) });
  } catch (error) {
    console.error('Loading authenticated user failed:', error);
    res.status(500).json({ message: 'Unable to load your account right now.' });
  }
};
