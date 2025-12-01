import express from 'express';
import { readJSON } from '../services/storage.js';
import { callAIProvider } from '../services/aiProviders.js';

const router = express.Router();
const MAX_TOOL_ITERATIONS = 5;

export function generateMockResult(outputSchema) {
  if (!outputSchema || typeof outputSchema !== 'object') {
    return { result: 'Function executed successfully' };
  }

  const mockData = {};

  if (outputSchema.type === 'object' && outputSchema.properties) {
    for (const [key, prop] of Object.entries(outputSchema.properties)) {
      if (prop.type === 'string') {
        mockData[key] = `mock_${key}`;
      } else if (prop.type === 'number') {
        mockData[key] = 0;
      } else if (prop.type === 'boolean') {
        mockData[key] = false;
      } else if (prop.type === 'array') {
        mockData[key] = [];
      } else if (prop.type === 'object') {
        mockData[key] = {};
      } else {
        mockData[key] = null;
      }
    }
  } else if (outputSchema.type === 'array') {
    return [];
  } else if (outputSchema.type === 'string') {
    return 'Function executed successfully';
  } else if (outputSchema.type === 'number') {
    return 0;
  } else if (outputSchema.type === 'boolean') {
    return false;
  }

  return mockData;
}

export function getMockResponse(funcDef) {
  if (funcDef && funcDef.mockResponse !== undefined) {
    return funcDef.mockResponse;
  }
  if (funcDef && funcDef.outputSchema) {
    return generateMockResult(funcDef.outputSchema);
  }
  return { result: 'Function executed successfully' };
}

function findFunctionDefinition(functions = [], funcName = '') {
  const sanitized = funcName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return functions.find(f => {
    if (!f?.name) return false;
    return f.name === funcName || f.name.replace(/[^a-zA-Z0-9_-]/g, '_') === sanitized;
  });
}

function safeParseArguments(rawArgs) {
  if (!rawArgs) {
    return {};
  }
  if (typeof rawArgs === 'object') {
    return rawArgs;
  }
  if (typeof rawArgs !== 'string') {
    return {};
  }
  try {
    return JSON.parse(rawArgs);
  } catch (err) {
    console.warn('Failed to parse tool arguments, defaulting to empty object:', err);
    return {};
  }
}

export async function runOpenAIConversation({
  provider,
  initialMessages,
  functions,
  model,
  maxIterations = MAX_TOOL_ITERATIONS,
  aiCaller = callAIProvider
}) {
  const messages = [...initialMessages];
  const functionCalls = [];
  const functionResults = [];

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const response = await aiCaller(provider, messages, functions, model);
    const choice = response?.choices?.[0];

    if (!choice) {
      throw new Error('OpenAI response did not include any choices.');
    }

    const toolCalls = choice.message?.tool_calls || [];
    const assistantContent = choice.message?.content || '';

    if (toolCalls.length === 0) {
      return {
        assistantMessage: assistantContent,
        functionCalls,
        functionResults
      };
    }

    messages.push({
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls
    });

    const toolResults = [];
    for (const toolCall of toolCalls) {
      const funcName = toolCall?.function?.name || 'unnamed_function';
      const parsedArgs = safeParseArguments(toolCall?.function?.arguments);

      functionCalls.push({
        id: toolCall.id,
        function: {
          name: funcName,
          arguments: parsedArgs
        }
      });

      const funcDef = findFunctionDefinition(functions, funcName);
      const mockResult = getMockResponse(funcDef);
      functionResults.push({
        id: toolCall.id,
        function: {
          name: funcName,
          result: mockResult
        }
      });

      console.log(`[conversation] Executed OpenAI tool call "${funcName}" (iteration ${iteration + 1}).`);

      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: funcName,
        content: JSON.stringify(mockResult)
      });
    }

    messages.push(...toolResults);
  }

  throw new Error('Exceeded OpenAI tool-call iteration limit without receiving a final response.');
}

export async function runAnthropicConversation({
  provider,
  initialMessages,
  functions,
  model,
  maxIterations = MAX_TOOL_ITERATIONS,
  aiCaller = callAIProvider
}) {
  const messages = [...initialMessages];
  const functionCalls = [];
  const functionResults = [];

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const response = await aiCaller(provider, messages, functions, model);
    const contentBlocks = response?.content || [];
    const toolUses = contentBlocks.filter(block => block.type === 'tool_use');
    const textParts = contentBlocks
      .filter(block => block.type === 'text')
      .map(block => block.text || '');

    if (toolUses.length === 0) {
      return {
        assistantMessage: textParts.join('\n\n'),
        functionCalls,
        functionResults
      };
    }

    messages.push({
      role: 'assistant',
      content: contentBlocks.map(block => {
        if (block.type === 'tool_use') {
          return {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input
          };
        }
        return { type: 'text', text: block.text || '' };
      })
    });

    const toolResults = [];
    for (const toolUse of toolUses) {
      const funcName = toolUse.name || 'unnamed_function';
      functionCalls.push({
        id: toolUse.id,
        function: {
          name: funcName,
          arguments: toolUse.input || {}
        }
      });

      const funcDef = findFunctionDefinition(functions, funcName);
      const mockResult = getMockResponse(funcDef);
      functionResults.push({
        id: toolUse.id,
        function: {
          name: funcName,
          result: mockResult
        }
      });

      console.log(`[conversation] Executed Anthropic tool use "${funcName}" (iteration ${iteration + 1}).`);

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(mockResult)
      });
    }

    messages.push({
      role: 'user',
      content: toolResults
    });
  }

  throw new Error('Exceeded Anthropic tool-call iteration limit without receiving a final response.');
}

// POST /api/conversation - Send message, get AI response
router.post('/', async (req, res) => {
  try {
    const { message, provider, model, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    // Get instructions and functions (session-specific)
    const instructions = await readJSON('instructions.json', req.sessionId);
    const functions = await readJSON('functions.json', req.sessionId);

    // Build messages array
    const messages = [];
    
    // Add system message if instructions exist (use generated content if available, otherwise use structured fields)
    const instructionContent = instructions.content || '';
    if (instructionContent && instructionContent.trim()) {
      messages.push({
        role: 'system',
        content: instructionContent
      });
    }

    // Add conversation history
    messages.push(...conversationHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    let assistantMessage = '';
    let functionCalls = [];
    let functionResults = [];
    const providerKey = provider.toLowerCase();

    if (providerKey === 'openai') {
      const conversationResult = await runOpenAIConversation({
        provider,
        initialMessages: messages,
        functions,
        model
      });
      assistantMessage = conversationResult.assistantMessage;
      functionCalls = conversationResult.functionCalls;
      functionResults = conversationResult.functionResults;
    } else if (providerKey === 'anthropic') {
      const conversationResult = await runAnthropicConversation({
        provider,
        initialMessages: messages,
        functions,
        model
      });
      assistantMessage = conversationResult.assistantMessage;
      functionCalls = conversationResult.functionCalls;
      functionResults = conversationResult.functionResults;
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    res.json({
      message: assistantMessage,
      functionCalls,
      functionResults,
      provider,
      model: model || 'default'
    });
  } catch (error) {
    console.error('Error in conversation:', error);
    
    if (error.message.includes('API key not configured')) {
      return res.status(400).json({ 
        error: error.message,
        code: 'API_KEY_NOT_CONFIGURED'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message
    });
  }
});

export default router;

