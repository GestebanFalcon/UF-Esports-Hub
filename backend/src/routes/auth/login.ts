import type { RequestHandler } from 'express';
import { compare } from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { loginRequestSchema, loginResponseSchema, toUser } from '@uf-esports-hub/shared';
import { createAccessToken } from '../../auth/tokens.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';

// Use the same bcrypt work factor for unknown emails to reduce timing differences.
const dummyPasswordHash = '$2b$12$kSPIcR5boGPkIayS01bk/e5FPUFsEjkhFMLlal.4pOmd8QNFHNCj2';

export const login: RequestHandler = async (req, res) => {
  const result = loginRequestSchema.safeParse(req.body);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? 'form');
      (fieldErrors[field] ??= []).push(issue.message);
    }
    res.status(400).json({ message: 'Please check your login information.', fieldErrors });
    return;
  }

  const { email, password } = result.data;
  // bcrypt truncates inputs after 72 bytes; never accept a matching truncated prefix.
  if (Buffer.byteLength(password, 'utf8') > 72) {
    res.status(400).json({
      message: 'Password is too long.',
      fieldErrors: { password: ['Password must be at most 72 bytes.'] },
    });
    return;
  }

  try {
    const [user] = await db.select().from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);

    const passwordMatches = await compare(password, user?.hashedPassword ?? dummyPasswordHash);
    if (!user || !passwordMatches) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    res.json(loginResponseSchema.parse({ user: toUser(user), ...await createAccessToken(user.id) }));
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ message: 'Unable to log in right now.' });
  }
};
