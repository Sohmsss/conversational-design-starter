import React, { useState, useEffect } from 'react';
import './InstructionEditor.css';
import '../styles/shared.css';

function InstructionEditor() {
  const [content, setContent] = useState('');
  const [userIntent, setUserIntent] = useState('');
  const [businessGoal, setBusinessGoal] = useState('');
  const [conversationGoal, setConversationGoal] = useState('');
  const [toneVoice, setToneVoice] = useState('');
  const [failureCases, setFailureCases] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    try {
      const response = await fetch('/api/instructions');
      if (!response.ok) throw new Error('Failed to load instructions');
      const data = await response.json();
      setContent(data.content || '');
      setUserIntent(data.userIntent || '');
      setBusinessGoal(data.businessGoal || '');
      setConversationGoal(data.conversationGoal || '');
      setToneVoice(data.toneVoice || '');
      setFailureCases(data.failureCases || '');
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveInstructions = async () => {
    try {
      setError(null);
      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content,
          userIntent,
          businessGoal,
          conversationGoal,
          toneVoice,
          failureCases
        })
      });

      if (!response.ok) throw new Error('Failed to save instructions');
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const generateInstructions = async () => {
    if (!userIntent.trim() && !businessGoal.trim() && !conversationGoal.trim()) {
      setError('Please fill in at least User Intent, Business Goal, or Conversation Goal');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/instructions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIntent,
          businessGoal,
          conversationGoal,
          toneVoice,
          failureCases,
          provider: 'openai'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate instructions');
      }

      const data = await response.json();
      setContent(data.content || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const clearInstructions = async () => {
    if (!window.confirm('Are you sure you want to clear all instructions?')) {
      return;
    }

    try {
      const response = await fetch('/api/instructions', {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to clear instructions');
      
      setContent('');
      setUserIntent('');
      setBusinessGoal('');
      setConversationGoal('');
      setToneVoice('');
      setFailureCases('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading instructions...</div>;
  }

  return (
    <div className="instruction-editor">
      <div className="editor-header">
        <h2>Assistant Instructions</h2>
        <div className="editor-actions">
          <button 
            className="button button-secondary" 
            onClick={clearInstructions}
          >
            Clear
          </button>
          <button 
            className="button button-primary" 
            onClick={saveInstructions}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="editor-help">
        <p>Define the system instructions for your AI assistant. Fill in the structured fields below, then click "Generate Instructions" to create comprehensive instructions using AI.</p>
      </div>

      <div className="instruction-fields">
        <div className="instruction-field-group">
          <label className="label">User Intent</label>
          <input
            className="input"
            type="text"
            value={userIntent}
            onChange={(e) => setUserIntent(e.target.value)}
            placeholder="What's the user trying to do? (e.g., Calculate Travel Money)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Business Goal</label>
          <input
            className="input"
            type="text"
            value={businessGoal}
            onChange={(e) => setBusinessGoal(e.target.value)}
            placeholder="What's the org trying to achieve? (e.g., Generate bookings)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Conversation Goal</label>
          <input
            className="input"
            type="text"
            value={conversationGoal}
            onChange={(e) => setConversationGoal(e.target.value)}
            placeholder="What's a successful outcome? (e.g., User completes booking confidently)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Tone/Voice</label>
          <input
            className="input"
            type="text"
            value={toneVoice}
            onChange={(e) => setToneVoice(e.target.value)}
            placeholder="What personality should it have? (e.g., Friendly, family-oriented, builds trust)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Failure Cases</label>
          <input
            className="input"
            type="text"
            value={failureCases}
            onChange={(e) => setFailureCases(e.target.value)}
            placeholder="What could go wrong? (e.g., Wrong dates, missing info)"
          />
        </div>

        <div className="generate-section">
          <button
            className="button button-primary"
            onClick={generateInstructions}
            disabled={generating || (!userIntent.trim() && !businessGoal.trim() && !conversationGoal.trim())}
          >
            {generating ? 'Generating...' : 'Generate Instructions'}
          </button>
        </div>
      </div>

      <div className="instruction-field-group">
        <div className="schema-header">
          <label className="label">Generated Instructions</label>
        </div>
        <textarea
          className="instruction-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Generated instructions will appear here. You can edit them directly if needed."
          rows={20}
        />
      </div>

      <div className="editor-footer">
        <small>Instructions are saved to your local data directory.</small>
      </div>
    </div>
  );
}

export default InstructionEditor;

