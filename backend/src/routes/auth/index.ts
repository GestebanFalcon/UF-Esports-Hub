import { Router } from 'express';
import { register } from './register.js';
import { login } from './login.js';
import { me } from './me.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { loginIpRateLimit, loginRateLimit, registrationRateLimit } from '../../middleware/auth-rate-limit.js';

export const authRouter = Router();

authRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

authRouter.post('/register', registrationRateLimit, register);
authRouter.post('/login', loginIpRateLimit, loginRateLimit, login);
authRouter.get('/me', requireAuth, me);
