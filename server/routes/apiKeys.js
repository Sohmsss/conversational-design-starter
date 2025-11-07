import express from 'express';
import { readJSON, writeJSON } from '../services/storage.js';
import { encrypt, decrypt, maskKey } from '../services/encryption.js';

const router = express.Router();

const SUPPORTED_PROVIDERS = ['openai', 'anthropic'];

// GET /api/api-keys - Get API keys (masked)
router.get('/', async (req, res) => {
  try {
    const apiKeys = await readJSON('apiKeys.json');
    
    // Return masked keys
    const masked = {};
    for (const [provider, encrypted] of Object.entries(apiKeys)) {
      if (encrypted) {
        const decrypted = decrypt(encrypted);
        masked[provider] = {
          encrypted: true,
          masked: maskKey(decrypted)
        };
      }
    }
    
    res.json(masked);
  } catch (error) {
    console.error('Error reading API keys:', error);
    res.status(500).json({ error: 'Failed to read API keys' });
  }
});

// POST /api/api-keys - Set API key for provider
router.post('/', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !SUPPORTED_PROVIDERS.includes(provider.toLowerCase())) {
      return res.status(400).json({ 
        error: `Provider must be one of: ${SUPPORTED_PROVIDERS.join(', ')}` 
      });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required' });
    }

    const apiKeys = await readJSON('apiKeys.json');
    const providerKey = provider.toLowerCase();
    
    apiKeys[providerKey] = encrypt(apiKey);
    await writeJSON('apiKeys.json', apiKeys);

    res.json({ 
      provider: providerKey,
      masked: maskKey(apiKey),
      message: 'API key saved successfully'
    });
  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

// DELETE /api/api-keys/:provider - Remove API key
router.delete('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const providerKey = provider.toLowerCase();

    if (!SUPPORTED_PROVIDERS.includes(providerKey)) {
      return res.status(400).json({ 
        error: `Provider must be one of: ${SUPPORTED_PROVIDERS.join(', ')}` 
      });
    }

    const apiKeys = await readJSON('apiKeys.json');
    
    if (!apiKeys[providerKey]) {
      return res.status(404).json({ error: 'API key not found for this provider' });
    }

    delete apiKeys[providerKey];
    await writeJSON('apiKeys.json', apiKeys);

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;

