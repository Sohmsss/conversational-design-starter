import express from 'express';
import { readJSON, writeJSON } from '../services/storage.js';
import { randomUUID } from 'crypto';
import { getOpenAIClient, getAnthropicClient } from '../services/aiProviders.js';

const router = express.Router();

// GET /api/functions - Get all function stubs
router.get('/', async (req, res) => {
  try {
    const functions = await readJSON('functions.json', req.sessionId);
    res.json(functions);
  } catch (error) {
    console.error('Error reading functions:', error);
    res.status(500).json({ error: 'Failed to read functions' });
  }
});

// Helper function to validate and sanitize function names
function validateFunctionName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Function name is required' };
  }
  
  // OpenAI requires: ^[a-zA-Z0-9_-]+$
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(name)) {
    return { 
      valid: false, 
      error: 'Function name can only contain letters, numbers, underscores, and hyphens. No spaces or special characters allowed.' 
    };
  }
  
  return { valid: true };
}

// Helper function to generate input schema from mock input
function generateSchemaFromMockInput(mockInput) {
  if (mockInput === null || mockInput === undefined) {
    return { type: 'object', properties: {}, required: [] };
  }

  const schema = {
    type: typeof mockInput === 'object' && !Array.isArray(mockInput) ? 'object' : 
           Array.isArray(mockInput) ? 'array' :
           typeof mockInput === 'string' ? 'string' :
           typeof mockInput === 'number' ? 'number' :
           typeof mockInput === 'boolean' ? 'boolean' : 'object',
    properties: {},
    required: []
  };

  if (schema.type === 'object' && mockInput && typeof mockInput === 'object' && !Array.isArray(mockInput)) {
    for (const [key, value] of Object.entries(mockInput)) {
      if (typeof value === 'string') {
        schema.properties[key] = { type: 'string' };
      } else if (typeof value === 'number') {
        schema.properties[key] = { type: 'number' };
      } else if (typeof value === 'boolean') {
        schema.properties[key] = { type: 'boolean' };
      } else if (Array.isArray(value)) {
        schema.properties[key] = { type: 'array', items: value.length > 0 ? generateSchemaFromMockInput(value[0]) : {} };
      } else if (value && typeof value === 'object') {
        schema.properties[key] = generateSchemaFromMockInput(value);
      } else {
        schema.properties[key] = { type: 'string' };
      }
      schema.required.push(key);
    }
  }

  return schema;
}

// POST /api/functions - Create new function stub
router.post('/', async (req, res) => {
  try {
    const { name, description, mockInput, inputSchema, mockResponse } = req.body;

    const nameValidation = validateFunctionName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    // Generate inputSchema from mockInput if provided, otherwise use provided inputSchema
    let finalInputSchema;
    if (mockInput !== undefined) {
      finalInputSchema = generateSchemaFromMockInput(mockInput);
    } else if (inputSchema && typeof inputSchema === 'object') {
      finalInputSchema = inputSchema;
    } else {
      return res.status(400).json({ error: 'Mock input or input schema is required' });
    }

    // mockResponse can be any valid JSON value (object, array, string, number, boolean, null)
    if (mockResponse === undefined) {
      return res.status(400).json({ error: 'Mock response is required' });
    }

    const functions = await readJSON('functions.json', req.sessionId);

    const newFunction = {
      id: randomUUID(),
      name,
      description: description || '',
      inputSchema: finalInputSchema,
      mockInput: mockInput !== undefined ? mockInput : null,
      mockResponse: mockResponse !== undefined ? mockResponse : null
    };

    functions.push(newFunction);
    await writeJSON('functions.json', functions, req.sessionId);

    res.status(201).json(newFunction);
  } catch (error) {
    console.error('Error creating function:', error);
    res.status(500).json({ error: 'Failed to create function' });
  }
});

// POST /api/functions/generate-mock - Generate input schema and mock response using AI
// IMPORTANT: This route must come BEFORE /:id routes to avoid route conflicts
router.post('/generate-mock', async (req, res) => {
  try {
    const { name, description, provider = 'openai' } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Function name is required' });
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Function description is required' });
    }

    // Check if API key exists for the provider
    const apiKeys = await readJSON('apiKeys.json');
    const providerKey = provider.toLowerCase();
    
    if (!apiKeys[providerKey]) {
      return res.status(400).json({ 
        error: `API key not configured for ${providerKey}. Please configure it in API Keys settings.` 
      });
    }

    // Create prompt for generating mock input and mock response
    const prompt = `You are a helpful assistant that generates function definitions. Generate example mock input and mock response for a function based on its name and description.

Function Name: ${name}
Function Description: ${description}

Generate:
1. A mock input - example JSON data showing what parameters this function would receive (make it realistic)
2. A mock response - example JSON data that this function would return (make it realistic and useful for testing)

Return ONLY a valid JSON object with this exact structure:
{
  "mockInput": { ... },
  "mockResponse": { ... }
}

Both should be realistic example data. Use realistic values, not placeholders like "mock_value". For example, if it's a customer profile function, include realistic names, IDs, dates, etc.`;

    let response;
    let schemasText;

    if (providerKey === 'openai') {
      const client = await getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates function definitions with realistic mock inputs and mock responses. Always return valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      schemasText = completion.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      schemasText = schemasText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (providerKey === 'anthropic') {
      const client = await getAnthropicClient();
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: 'You are a helpful assistant that generates function definitions with realistic mock inputs and mock responses. Always return valid JSON only, no markdown formatting.'
      });

      schemasText = message.content[0].text.trim();
      // Remove markdown code blocks if present
      schemasText = schemasText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    // Parse the response
    let result;
    try {
      result = JSON.parse(schemasText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', schemasText);
      return res.status(500).json({ 
        error: 'Failed to parse AI response. Please try again or manually create the function definition.',
        rawResponse: schemasText
      });
    }

    // Validate the structure
    if (!result.mockInput) {
      return res.status(500).json({ 
        error: 'AI response missing mock input. Please try again or manually create the function definition.',
        rawResponse: schemasText
      });
    }

    if (result.mockResponse === undefined) {
      return res.status(500).json({ 
        error: 'AI response missing mock response. Please try again or manually create the function definition.',
        rawResponse: schemasText
      });
    }

    // Generate input schema from mock input
    const inputSchema = generateSchemaFromMockInput(result.mockInput);

    res.json({
      mockInput: result.mockInput,
      inputSchema: inputSchema,
      mockResponse: result.mockResponse
    });
  } catch (error) {
    console.error('Error generating schemas:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate schemas. Please check your API key configuration.' 
    });
  }
});

// PUT /api/functions/:id - Update function stub
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, mockInput, inputSchema, mockResponse } = req.body;

    const functions = await readJSON('functions.json', req.sessionId);
    const index = functions.findIndex(f => f.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Function not found' });
    }

    if (name !== undefined) {
      const nameValidation = validateFunctionName(name);
      if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.error });
      }
    }

    // Generate inputSchema from mockInput if provided
    let finalInputSchema = functions[index].inputSchema;
    if (mockInput !== undefined) {
      finalInputSchema = generateSchemaFromMockInput(mockInput);
    } else if (inputSchema !== undefined && typeof inputSchema === 'object') {
      finalInputSchema = inputSchema;
    }

    functions[index] = {
      ...functions[index],
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(finalInputSchema && { inputSchema: finalInputSchema }),
      ...(mockInput !== undefined && { mockInput }),
      ...(mockResponse !== undefined && { mockResponse })
    };

    await writeJSON('functions.json', functions, req.sessionId);
    res.json(functions[index]);
  } catch (error) {
    console.error('Error updating function:', error);
    res.status(500).json({ error: 'Failed to update function' });
  }
});

// DELETE /api/functions/:id - Delete function stub
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const functions = await readJSON('functions.json', req.sessionId);
    const filtered = functions.filter(f => f.id !== id);

    if (functions.length === filtered.length) {
      return res.status(404).json({ error: 'Function not found' });
    }

    await writeJSON('functions.json', filtered, req.sessionId);
    res.json({ message: 'Function deleted successfully' });
  } catch (error) {
    console.error('Error deleting function:', error);
    res.status(500).json({ error: 'Failed to delete function' });
  }
});

export default router;

