import express from 'express';
import { readJSON, writeJSON } from '../services/storage.js';
import { getOpenAIClient, getAnthropicClient } from '../services/aiProviders.js';

const router = express.Router();

// GET /api/instructions - Get current instructions
router.get('/', async (req, res) => {
  try {
    const instructions = await readJSON('instructions.json', req.sessionId);
    res.json(instructions);
  } catch (error) {
    console.error('Error reading instructions:', error);
    res.status(500).json({ error: 'Failed to read instructions' });
  }
});

// POST /api/instructions - Save/update instructions
router.post('/', async (req, res) => {
  try {
    const { content, audience, values, toneVoice, serviceExperience, motivations, frustrations } = req.body;

    // Support both old format (content) and new format (structured fields)
    const instructions = {
      ...(content !== undefined && { content }),
      ...(audience !== undefined && { audience }),
      ...(values !== undefined && { values }),
      ...(toneVoice !== undefined && { toneVoice }),
      ...(serviceExperience !== undefined && { serviceExperience }),
      ...(motivations !== undefined && { motivations }),
      ...(frustrations !== undefined && { frustrations }),
      updatedAt: new Date().toISOString()
    };

    await writeJSON('instructions.json', instructions, req.sessionId);
    res.json(instructions);
  } catch (error) {
    console.error('Error saving instructions:', error);
    res.status(500).json({ error: 'Failed to save instructions' });
  }
});

// DELETE /api/instructions - Clear instructions
router.delete('/', async (req, res) => {
  try {
    const instructions = {
      content: '',
      audience: '',
      values: '',
      toneVoice: '',
      serviceExperience: '',
      motivations: '',
      frustrations: '',
      updatedAt: new Date().toISOString()
    };

    await writeJSON('instructions.json', instructions, req.sessionId);
    res.json(instructions);
  } catch (error) {
    console.error('Error clearing instructions:', error);
    res.status(500).json({ error: 'Failed to clear instructions' });
  }
});

// POST /api/instructions/generate - Generate instructions from structured fields
router.post('/generate', async (req, res) => {
  try {
    const { audience, values, toneVoice, serviceExperience, motivations, frustrations, provider = 'openai' } = req.body;

    // Check if API key exists for the provider
    const apiKeys = await readJSON('apiKeys.json');
    const providerKey = provider.toLowerCase();

    if (!apiKeys[providerKey]) {
      return res.status(400).json({
        error: `API key not configured for ${providerKey}. Please configure it in API Keys settings.`
      });
    }

    // Create prompt for generating instructions
    const prompt = `You are an expert at writing AI assistant instructions. Generate comprehensive system instructions for an AI assistant based on the following information:

Audience: ${audience || 'Not specified'}
Values: ${values || 'Not specified'}
Tone of Voice: ${toneVoice || 'Not specified'}
Service and Experience: ${serviceExperience || 'Not specified'}
Motivations: ${motivations || 'Not specified'}
Frustrations: ${frustrations || 'Not specified'}

Generate detailed, actionable system instructions using this structure:

Start with: "You are a helpful assistant. You will assist [audience] with [service/experience]..."

Then include sections that:
1. Define your role and purpose clearly
2. Explain the brand values you embody: [values]
3. Describe your tone of voice: [toneVoice]
4. Address what motivates users: [motivations]
5. Explain how you help solve their frustrations: [frustrations]
6. Provide specific guidance on how to handle conversations

Use second person ("You are...", "You will...", "You should...") throughout the instructions.

Return ONLY the instructions text, no markdown formatting, no explanations, just the instructions themselves.`;

    let instructionsText;

    if (providerKey === 'openai') {
      const client = await getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates AI system instructions. Always return only the instructions text, no markdown formatting, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      instructionsText = completion.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      instructionsText = instructionsText.replace(/```\n?/g, '').trim();
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
        system: 'You are a helpful assistant that generates AI system instructions. Always return only the instructions text, no markdown formatting, no explanations.'
      });

      instructionsText = message.content[0].text.trim();
      // Remove markdown code blocks if present
      instructionsText = instructionsText.replace(/```\n?/g, '').trim();
    } else {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    res.json({ content: instructionsText });
  } catch (error) {
    console.error('Error generating instructions:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate instructions. Please check your API key configuration.' 
    });
  }
});

export default router;

