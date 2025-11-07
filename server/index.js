import express from 'express';
import cors from 'cors';
import instructionsRouter from './routes/instructions.js';
import functionsRouter from './routes/functions.js';
import apiKeysRouter from './routes/apiKeys.js';
import conversationRouter from './routes/conversation.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/instructions', instructionsRouter);
app.use('/api/functions', functionsRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/conversation', conversationRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

