import express from 'express';
import { readJSON, writeJSON } from '../services/storage.js';
import { getOpenAIClient, getAnthropicClient } from '../services/aiProviders.js';

const router = express.Router();

// GET /api/instructions - Get current instructions
router.get('/', async (req, res) => {
  try {
    const instructions = await readJSON('instructions.json');
    res.json(instructions);
  } catch (error) {
    console.error('Error reading instructions:', error);
    res.status(500).json({ error: 'Failed to read instructions' });
  }
});

// POST /api/instructions - Save/update instructions
router.post('/', async (req, res) => {
  try {
    const { content, userIntent, businessGoal, conversationGoal, toneVoice, failureCases } = req.body;
    
    // Support both old format (content) and new format (structured fields)
    const instructions = {
      ...(content !== undefined && { content }),
      ...(userIntent !== undefined && { userIntent }),
      ...(businessGoal !== undefined && { businessGoal }),
      ...(conversationGoal !== undefined && { conversationGoal }),
      ...(toneVoice !== undefined && { toneVoice }),
      ...(failureCases !== undefined && { failureCases }),
      updatedAt: new Date().toISOString()
    };

    await writeJSON('instructions.json', instructions);
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
      userIntent: '',
      businessGoal: '',
      conversationGoal: '',
      toneVoice: '',
      failureCases: '',
      updatedAt: new Date().toISOString()
    };

    await writeJSON('instructions.json', instructions);
    res.json(instructions);
  } catch (error) {
    console.error('Error clearing instructions:', error);
    res.status(500).json({ error: 'Failed to clear instructions' });
  }
});

// POST /api/instructions/generate - Generate instructions from structured fields
router.post('/generate', async (req, res) => {
  try {
    const { userIntent, businessGoal, conversationGoal, toneVoice, failureCases, provider = 'openai' } = req.body;

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

User Intent: ${userIntent || 'Not specified'}
Business Goal: ${businessGoal || 'Not specified'}
Conversation Goal: ${conversationGoal || 'Not specified'}
Tone/Voice: ${toneVoice || 'Not specified'}
Failure Cases: ${failureCases || 'Not specified'}

Generate detailed, actionable system instructions that:
1. Clearly define the assistant's role and purpose
2. Incorporate the specified tone and voice
3. Guide the assistant toward achieving the business and conversation goals
4. Address the potential failure cases with specific handling strategies
5. Are written in a clear, professional manner suitable for a system prompt

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

