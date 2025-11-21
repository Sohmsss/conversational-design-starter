import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { sessionMiddleware } from './middleware/session.js';
import instructionsRouter from './routes/instructions.js';
import functionsRouter from './routes/functions.js';
import apiKeysRouter from './routes/apiKeys.js';
import conversationRouter from './routes/conversation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

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

// Serve static files in production
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));

  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (isProduction) {
    console.log('Serving static files from client/dist');
  }
});

