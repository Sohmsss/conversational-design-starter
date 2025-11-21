import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './middleware/session.js';
import instructionsRouter from './routes/instructions.js';
import functionsRouter from './routes/functions.js';
import apiKeysRouter from './routes/apiKeys.js';
import conversationRouter from './routes/conversation.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

// Routes
app.use('/api/instructions', instructionsRouter);
app.use('/api/functions', functionsRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/conversation', conversationRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get session ID
app.get('/api/session', (req, res) => {
  res.json({ sessionId: req.sessionId });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

