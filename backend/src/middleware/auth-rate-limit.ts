import { createHash } from 'node:crypto';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { loginRequestSchema } from '@uf-esports-hub/shared';

// A broad ceiling limits work even when callers rotate emails or know valid credentials.
export const loginIpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many login requests. Please try again later.' },
});

// Failures for one email should not lock out other users behind the same campus IP.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const result = loginRequestSchema.shape.email.safeParse(req.body?.email);
    const email = result.success ? result.data.toLowerCase() : 'invalid-email';
    const emailKey = createHash('sha256').update(email).digest('hex');
    return `${ipKeyGenerator(req.ip ?? 'unknown')}:${emailKey}`;
  },
  message: { message: 'Too many failed login attempts for this email. Please try again later.' },
});

// Count every registration, including successful account creation and password hashing.
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many registration requests. Please try again later.' },
});
