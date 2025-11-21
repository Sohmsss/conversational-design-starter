import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './ConversationPanel.css';
import '../styles/shared.css';

function ConversationPanel() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKeys, setApiKeys] = useState({});

  const providers = {
    openai: {
      name: 'OpenAI',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    anthropic: {
      name: 'Anthropic',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229']
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  useEffect(() => {
    // Set default model when provider changes
    if (providers[provider] && providers[provider].models.length > 0) {
      setModel(providers[provider].models[0]);
    }
  }, [provider]);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to load API keys');
      const data = await response.json();
      setApiKeys(data);
    } catch (err) {
      console.error('Error loading API keys:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);

    // Add user message to conversation
    const newMessages = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Note: API key can be set via environment variable or in API Keys tab
      // Backend will return error if neither is configured

      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          provider,
          model,
          conversationHistory: newMessages.slice(0, -1) // Exclude the current message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      // Add assistant response
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.message,
          functionCalls: data.functionCalls || [],
          functionResults: data.functionResults || []
        }
      ]);
    } catch (err) {
      setError(err.message);
      // Remove the user message if there was an error
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    if (window.confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
      setError(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasApiKey = apiKeys[provider] && apiKeys[provider].encrypted;

  return (
    <div className="conversation-panel">
      <div className="conversation-header">
        <h2>Test Conversation</h2>
        <div className="conversation-controls">
          <div className="provider-selector">
            <label className="label">Provider:</label>
            <select
              className="select"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setMessages([]); // Clear conversation when switching providers
              }}
            >
              {Object.entries(providers).map(([id, config]) => (
                <option key={id} value={id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
          <div className="model-selector">
            <label className="label">Model:</label>
            <select
              className="select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {providers[provider]?.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {messages.length > 0 && (
            <button
              className="button button-secondary button-small"
              onClick={clearConversation}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-conversation">
            <p>Start a conversation to test your assistant.</p>
            <p className="hint">Make sure you've configured your instructions. API keys can be set via environment variables or in the API Keys tab.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-header">
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}</strong>
              </div>
              <div className="message-content">
                {msg.content && (
                  msg.role === 'assistant' ? (
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )
                )}
                {msg.functionCalls && msg.functionCalls.length > 0 && (
                  <div className="function-calls">
                    <strong>Function Calls:</strong>
                    {msg.functionCalls.map((fc, fcIdx) => {
                      // Find corresponding result if available
                      const result = msg.functionResults && msg.functionResults.find(r => r.id === fc.id);
                      return (
                        <div key={fcIdx} className="function-call">
                          <div className="function-call-header">
                            <code className="function-name">{fc.function.name}</code>
                          </div>
                          <div className="function-call-section">
                            <span className="function-call-label">Input:</span>
                            <pre className="function-args">
                              {JSON.stringify(fc.function.arguments, null, 2)}
                            </pre>
                          </div>
                          {result && (
                            <div className="function-call-section">
                              <span className="function-call-label">Output:</span>
                              <pre className="function-result">
                                {JSON.stringify(result.function.result, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message message-assistant">
            <div className="message-content">
              <div className="loading-indicator">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      <div className="input-container">
        <textarea
          className="input message-input"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
          rows={3}
          disabled={loading}
        />
        <button
          className="button button-primary send-button"
          onClick={sendMessage}
          disabled={!inputMessage.trim() || loading}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default ConversationPanel;

