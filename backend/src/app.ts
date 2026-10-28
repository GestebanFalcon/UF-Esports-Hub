import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth/index.js';

export const app = express();

app.disable('x-powered-by');

// Allow our frontend to communicate with the backend
app.use(cors({
  origin: 'http://localhost:5173',
}));

app.use(express.json({ limit: '10kb' }));

// Check if the backend is running
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
