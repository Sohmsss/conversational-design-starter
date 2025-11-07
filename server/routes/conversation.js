import express from 'express';
import { readJSON } from '../services/storage.js';
import { callAIProvider } from '../services/aiProviders.js';

const router = express.Router();

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

    // Get instructions and functions
    const instructions = await readJSON('instructions.json');
    const functions = await readJSON('functions.json');

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

    // Helper function to get mock response from function definition
    function getMockResponse(funcDef) {
      if (funcDef && funcDef.mockResponse !== undefined) {
        return funcDef.mockResponse;
      }
      // Fallback for old functions that might still have outputSchema
      if (funcDef && funcDef.outputSchema) {
        // Generate basic mock from schema (backward compatibility)
        return generateMockResult(funcDef.outputSchema);
      }
      return { result: 'Function executed successfully' };
    }

    // Helper function to generate mock data based on output schema (for backward compatibility)
    function generateMockResult(outputSchema) {
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

    // Call AI provider
    let response = await callAIProvider(
      provider,
      messages,
      functions,
      model
    );

    // Format response based on provider
    let assistantMessage = '';
    let functionCalls = [];
    let functionResults = [];
    let updatedMessages = [...messages];

    if (provider.toLowerCase() === 'openai') {
      const choice = response.choices[0];
      assistantMessage = choice.message.content || '';
      
      // Add assistant message with function calls to conversation
      updatedMessages.push({
        role: 'assistant',
        content: assistantMessage,
        tool_calls: choice.message.tool_calls
      });
      
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        functionCalls = choice.message.tool_calls.map(tool => ({
          id: tool.id,
          function: {
            name: tool.function.name,
            arguments: JSON.parse(tool.function.arguments || '{}')
          }
        }));

        // Execute functions and add results to conversation
        const toolResults = [];
        for (const toolCall of choice.message.tool_calls) {
          const funcName = toolCall.function.name;
          // Find the function definition (handle sanitized names)
          const funcDef = functions.find(f => {
            const sanitized = funcName.replace(/[^a-zA-Z0-9_-]/g, '_');
            return f.name === funcName || f.name.replace(/[^a-zA-Z0-9_-]/g, '_') === sanitized;
          });
          
          const mockResult = getMockResponse(funcDef);

          // Store function result for response
          functionResults.push({
            id: toolCall.id,
            function: {
              name: funcName,
              result: mockResult
            }
          });

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: funcName,
            content: JSON.stringify(mockResult)
          });
        }

        // Add tool results to messages
        updatedMessages.push(...toolResults);

        // Make follow-up call with function results
        response = await callAIProvider(
          provider,
          updatedMessages,
          functions,
          model
        );

        const followUpChoice = response.choices[0];
        assistantMessage = followUpChoice.message.content || '';
      }
    } else if (provider.toLowerCase() === 'anthropic') {
      const content = response.content[0];
      
      if (content.type === 'text') {
        assistantMessage = content.text;
      } else if (content.type === 'tool_use') {
        functionCalls = [{
          id: content.id,
          function: {
            name: content.name,
            arguments: content.input
          }
        }];
      }
      
      // Handle multiple content blocks
      if (response.content.length > 1) {
        const textParts = response.content
          .filter(c => c.type === 'text')
          .map(c => c.text);
        assistantMessage = textParts.join('\n\n');
        
        const toolUses = response.content
          .filter(c => c.type === 'tool_use')
          .map(c => ({
            id: c.id,
            function: {
              name: c.name,
              arguments: c.input
            }
          }));
        functionCalls = toolUses;
      }

      // If there are tool uses, execute them and get follow-up response
      if (functionCalls.length > 0) {
        // Add assistant message with tool uses (Anthropic format)
        updatedMessages.push({
          role: 'assistant',
          content: response.content.map(c => {
            if (c.type === 'tool_use') {
              return {
                type: 'tool_use',
                id: c.id,
                name: c.name,
                input: c.input
              };
            }
            return { type: 'text', text: c.text || '' };
          })
        });

        // Execute functions and prepare tool results
        const toolResults = [];
        for (const toolUse of response.content.filter(c => c.type === 'tool_use')) {
          const funcName = toolUse.name;
          const funcDef = functions.find(f => f.name === funcName);
          
          const mockResult = getMockResponse(funcDef);

          // Store function result for response
          functionResults.push({
            id: toolUse.id,
            function: {
              name: funcName,
              result: mockResult
            }
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(mockResult)
          });
        }

        // Add tool results to messages (Anthropic expects array of content blocks)
        updatedMessages.push({
          role: 'user',
          content: toolResults
        });

        // Make follow-up call with function results
        response = await callAIProvider(
          provider,
          updatedMessages,
          functions,
          model
        );

        // Extract final response
        if (response.content && response.content.length > 0) {
          const textParts = response.content
            .filter(c => c.type === 'text')
            .map(c => c.text);
          assistantMessage = textParts.length > 0 ? textParts.join('\n\n') : '';
        }
      }
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

