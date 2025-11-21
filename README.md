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

1. Start both server and client in development mode:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:3000`

2. Open your browser and navigate to `http://localhost:3000`

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

## Contributing

This is an open-source project. Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

