import { Router } from 'express';
import {
  profileResponseSchema, profileUpdateSchema, profilePaths,
  type ProfileResponse, type ProfileUpdate,
} from '@uf-esports-hub/shared';
import { requireAuth } from '../../middleware/require-auth.js';

/**
 * Authentication middleware must verify a signed, unexpired session and
 * set res.locals.userId, as requireAuth does. NEVER copy an id from a request header,
 * parameter, cookie value, or body into this property without verification.
 */
export interface ProfileStore {
  getByUserId(userId: string): Promise<ProfileResponse | null>;
  updateByUserId(userId: string, data: ProfileUpdate): Promise<ProfileResponse | null>;
}


/** Authentication is required; persistence is supplied by the application. */
export function createProfileRouter({ store }: { store: ProfileStore }) {
  const router = Router();
  router.use(requireAuth);
  router.use((_, res, next) => {
    res.set('Cache-Control', 'no-store');
    const userId: unknown = res.locals.userId;
    // No client-provided identifier is ever considered.
    if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    next();
  });

  router.get('/', async (_req, res) => {
    try {
      const profile = await store.getByUserId(res.locals.userId as string);
      if (!profile) {
        res.status(404).json({ message: 'Player profile not found.' });
        return;
      }
      res.json(profileResponseSchema.parse(profile));
    } catch (error) {
      console.error('Failed to retrieve player profile', error);
      res.status(500).json({ message: 'Unable to retrieve profile.' });
    }
  });

  router.patch('/', async (req, res) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Invalid profile fields.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const profile = await store.updateByUserId(
        res.locals.userId as string,
        parsed.data,
      );
      if (!profile) {
        res.status(404).json({ message: 'Player profile not found.' });
        return;
      }
      res.json(profileResponseSchema.parse(profile));
    } catch (error) {
      console.error('Failed to save player profile', error);
      res.status(500).json({ message: 'Unable to save profile.' });
    }
  });

  return router;
}

export { profilePaths };
