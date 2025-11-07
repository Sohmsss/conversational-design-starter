import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { readJSON } from './storage.js';
import { decrypt } from './encryption.js';

async function getApiKey(provider) {
  const apiKeys = await readJSON('apiKeys.json');
  const encrypted = apiKeys[provider];
  
  if (!encrypted) {
    throw new Error(`API key not configured for ${provider}`);
  }
  
  return decrypt(encrypted);
}

export async function getOpenAIClient() {
  const apiKey = await getApiKey('openai');
  return new OpenAI({ apiKey });
}

export async function getAnthropicClient() {
  const apiKey = await getApiKey('anthropic');
  return new Anthropic({ apiKey });
}

// Sanitize function name to match OpenAI requirements: ^[a-zA-Z0-9_-]+$
function sanitizeFunctionName(name) {
  if (!name || typeof name !== 'string') {
    return 'unnamed_function';
  }
  // Replace spaces and invalid characters with underscores
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

export async function callOpenAI(messages, functions, model = 'gpt-4') {
  const client = await getOpenAIClient();
  
  // Convert function stubs to OpenAI function format
  // Use inputSchema directly as it's already in JSON Schema format
  const tools = functions.map(func => ({
    type: 'function',
    function: {
      name: sanitizeFunctionName(func.name),
      description: func.description || '',
      parameters: func.inputSchema || {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }));

  const response = await client.chat.completions.create({
    model,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : undefined
  });

  return response;
}

export async function callAnthropic(messages, functions, model = 'claude-3-5-sonnet-20241022') {
  const client = await getAnthropicClient();
  
  // Convert messages to Anthropic format
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  const system = systemMessages.length > 0 
    ? systemMessages.map(m => m.content).join('\n')
    : undefined;

  // Convert function stubs to Anthropic tool format
  // Use inputSchema directly as it's already in JSON Schema format
  const tools = functions.map(func => ({
    name: func.name,
    description: func.description || '',
    input_schema: func.inputSchema || {
      type: 'object',
      properties: {},
      required: []
    }
  }));

  // Convert messages to Anthropic format
  const formattedMessages = conversationMessages.map(m => {
    if (m.role === 'assistant') {
      // Assistant messages can have content as array or string
      return {
        role: 'assistant',
        content: Array.isArray(m.content) ? m.content : (typeof m.content === 'string' ? m.content : String(m.content))
      };
    } else {
      // User messages can have content as array (for tool results) or string
      return {
        role: 'user',
        content: Array.isArray(m.content) ? m.content : (typeof m.content === 'string' ? m.content : String(m.content))
      };
    }
  });

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: formattedMessages,
    tools: tools.length > 0 ? tools : undefined
  });

  return response;
}

export async function callAIProvider(provider, messages, functions, model) {
  switch (provider.toLowerCase()) {
    case 'openai':
      return await callOpenAI(messages, functions, model);
    case 'anthropic':
      return await callAnthropic(messages, functions, model);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

