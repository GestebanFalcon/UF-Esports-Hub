import { Router } from 'express';
import { register } from './register.js';

export const authRouter = Router();

authRouter.post('/register', register);
