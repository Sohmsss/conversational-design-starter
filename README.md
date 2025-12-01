# Conversational Design Starter

A simple, open-source web application for designing AI conversational assistants. Perfect for both developers and non-technical users to plan and test their AI assistant designs.

## Features

- **Instruction Management**: Define system instructions for your AI assistant
- **Function Stub Management**: Create and manage function stubs to plan what functions your assistant will need
- **API Key Management**: Securely store API keys for multiple AI providers (OpenAI, Anthropic)
- **Test Conversation**: Chat with your assistant to test instructions and function calls
- **Export**: Export your design as JSON or Markdown documentation

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Storage**: File-based JSON files
- **AI Providers**: OpenAI, Anthropic

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Sohmsss/conversational-design-starter
cd conversational-design-starter
```

2. Install dependencies:
```bash
npm run install-all
```

This will install dependencies for both the root project, server, and client.

## Running the Application

1. (Optional) Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys if you want to use environment variables
```

2. Start both server and client in development mode:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:3000`

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Set Instructions**: Go to the Instructions tab and define how your assistant should behave
2. **Create Function Stubs**: In the Functions tab, add function stubs that your assistant will need
3. **Configure API Keys**: Add your API keys in the API Keys tab (keys are encrypted before storage)
4. **Test Conversation**: Use the Test Conversation tab to chat with your assistant
5. **Export**: Export your design as JSON or Markdown in the Export tab

## Project Structure

```
conversational-design-starter/
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic (storage, AI providers)
│   └── data/            # JSON file storage (created automatically)
├── client/              # React frontend
│   └── src/
│       ├── components/  # React components
│       └── styles/      # CSS files
└── package.json         # Root package.json with scripts
```

## Data Storage

All data is stored in JSON files in the `server/data/` directory:
- `instructions.json` - Assistant instructions
- `functions.json` - Function stubs
- `apiKeys.json` - Encrypted API keys

**Note**: The `data/` directory is gitignored for security. Your API keys and designs are stored locally.

## Security

- API keys are encrypted using AES-256-CBC before storage
- Set the `ENCRYPTION_KEY` environment variable for production use
- Default encryption key is used for development only (not secure for production)

## Deployment

### Environment Variables

For production deployments (Railway, Heroku, etc.), you can use environment variables instead of the API Keys UI:

- `OPENAI_API_KEY` - Your OpenAI API key
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `ENCRYPTION_KEY` - (Optional) Custom encryption key for local file encryption

The application will prioritize environment variables over the API Keys JSON file. This is ideal for:
- Shared deployments (workshops, demos)
- Production environments
- CI/CD pipelines

### Railway Deployment

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables in Railway dashboard:
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `PORT` (Railway sets this automatically)
4. Deploy!

**Note**: For workshops with multiple users sharing one API key, environment variables are the recommended approach. Remember to monitor your API usage and disable keys after the event.

## API Endpoints

- `GET /api/instructions` - Get instructions
- `POST /api/instructions` - Save instructions
- `DELETE /api/instructions` - Clear instructions
- `GET /api/functions` - Get all function stubs
- `POST /api/functions` - Create function stub
- `PUT /api/functions/:id` - Update function stub
- `DELETE /api/functions/:id` - Delete function stub
- `GET /api/api-keys` - Get API keys (masked)
- `POST /api/api-keys` - Save API key
- `DELETE /api/api-keys/:provider` - Delete API key
- `POST /api/conversation` - Send message to AI

## Tool Call Handling

- Tool/function calls are executed iteratively until the assistant returns a natural-language reply or a safeguard limit (5 iterations) is hit.
- Each tool execution is logged by the server so you can trace which stub ran and what mock data was returned.
- If the iteration limit is exceeded—for example, due to an endlessly looping prompt—the API responds with a 500 error explaining that no final response was produced. Adjust your prompt or tool definitions before retrying.

## Contributing

This is an open-source project. Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

