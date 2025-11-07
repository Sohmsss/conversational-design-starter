import React, { useState, useEffect } from 'react';
import './ApiKeyManager.css';
import '../styles/shared.css';

function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState({});

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to load API keys');
      const data = await response.json();
      setApiKeys(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!apiKey.trim()) {
        setError('API key is required');
        return;
      }

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API key');
      }

      setApiKey('');
      setSuccess(`API key saved for ${selectedProvider}`);
      setTimeout(() => setSuccess(null), 3000);
      loadApiKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteApiKey = async (provider) => {
    if (!window.confirm(`Are you sure you want to delete the API key for ${provider}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${provider}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      setSuccess(`API key deleted for ${provider}`);
      setTimeout(() => setSuccess(null), 3000);
      loadApiKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleShowKey = (provider) => {
    setShowKey({
      ...showKey,
      [provider]: !showKey[provider]
    });
  };

  if (loading) {
    return <div className="loading">Loading API keys...</div>;
  }

  const providers = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'] }
  ];

  return (
    <div className="api-key-manager">
      <h2>API Key Management</h2>
      <p className="section-description">
        Configure API keys for AI providers. Keys are encrypted and stored locally.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="api-key-form card">
        <h3>Add or Update API Key</h3>
        
        <div className="form-group">
          <label className="label">Provider</label>
          <select
            className="select"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">API Key</label>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${providers.find(p => p.id === selectedProvider)?.name} API key`}
          />
          <small className="help-text">
            Your API key will be encrypted before storage. Never share your API keys publicly.
          </small>
        </div>

        <button className="button button-primary" onClick={saveApiKey}>
          Save API Key
        </button>
      </div>

      <div className="api-keys-list">
        <h3>Configured API Keys</h3>
        {Object.keys(apiKeys).length === 0 ? (
          <p className="empty-state">No API keys configured. Add one above to get started.</p>
        ) : (
          <div className="keys-grid">
            {providers.map(provider => {
              const keyData = apiKeys[provider.id];
              if (!keyData) return null;

              return (
                <div key={provider.id} className="api-key-card card">
                  <div className="api-key-header">
                    <h4>{provider.name}</h4>
                    <button
                      className="button button-small button-danger"
                      onClick={() => deleteApiKey(provider.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="api-key-value">
                    <code>
                      {showKey[provider.id] 
                        ? keyData.masked 
                        : '••••••••••••••••'}
                    </code>
                    <button
                      className="button button-small button-secondary"
                      onClick={() => toggleShowKey(provider.id)}
                    >
                      {showKey[provider.id] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="api-key-info">
                    <small>Status: <span className="status-active">Configured</span></small>
                    <div className="models-list">
                      <strong>Available Models:</strong>
                      <ul>
                        {provider.models.map(model => (
                          <li key={model}><code>{model}</code></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="api-key-help card">
        <h3>Getting API Keys</h3>
        <ul>
          <li>
            <strong>OpenAI:</strong> Get your API key from{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
              platform.openai.com/api-keys
            </a>
          </li>
          <li>
            <strong>Anthropic:</strong> Get your API key from{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
              console.anthropic.com/settings/keys
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ApiKeyManager;

