import express from 'express';
import { authRouter } from './routes/auth';        // added
import { InMemoryUserRepo } from './users';        // added

export const app = express();

app.disable('x-powered-by');
app.use(express.json());

const users = new InMemoryUserRepo();               // added
app.use('/auth', authRouter(users));                // added

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});