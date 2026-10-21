import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { DuplicateEmailError, UserRepo } from '../users';

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
});

export function authRouter(users: UserRepo) {
  const router = Router();

  router.post('/register', async (req, res, next) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
    }
    const { email, password } = parsed.data;

    try {
      if (await users.findByEmail(email)) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await users.create({ email, passwordHash });
      return res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
    } catch (err) {
      if (err instanceof DuplicateEmailError) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      next(err);
    }
  });

  return router;
}