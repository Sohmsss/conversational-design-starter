import React, { useState, useEffect } from 'react';
import './InstructionEditor.css';
import '../styles/shared.css';

function InstructionEditor() {
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('');
  const [values, setValues] = useState('');
  const [toneVoice, setToneVoice] = useState('');
  const [serviceExperience, setServiceExperience] = useState('');
  const [motivations, setMotivations] = useState('');
  const [frustrations, setFrustrations] = useState('');
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
      setAudience(data.audience || '');
      setValues(data.values || '');
      setToneVoice(data.toneVoice || '');
      setServiceExperience(data.serviceExperience || '');
      setMotivations(data.motivations || '');
      setFrustrations(data.frustrations || '');
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
          audience,
          values,
          toneVoice,
          serviceExperience,
          motivations,
          frustrations
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
    if (!audience.trim() && !values.trim() && !serviceExperience.trim()) {
      setError('Please fill in at least one field');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/instructions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          values,
          toneVoice,
          serviceExperience,
          motivations,
          frustrations,
          provider: 'openai'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate instructions');
      }

      const data = await response.json();
      setContent(data.content || '');
      if (data.audience !== undefined) setAudience(data.audience);
      if (data.values !== undefined) setValues(data.values);
      if (data.toneVoice !== undefined) setToneVoice(data.toneVoice);
      if (data.serviceExperience !== undefined) setServiceExperience(data.serviceExperience);
      if (data.motivations !== undefined) setMotivations(data.motivations);
      if (data.frustrations !== undefined) setFrustrations(data.frustrations);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
      setAudience('');
      setValues('');
      setToneVoice('');
      setServiceExperience('');
      setMotivations('');
      setFrustrations('');
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
          <label className="label">Audience</label>
          <input
            className="input"
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Who are we talking to? (e.g., Budget-conscious travelers)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Values</label>
          <input
            className="input"
            type="text"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="What are the brand values to follow? (e.g., Transparency, empowerment)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Tone of Voice</label>
          <input
            className="input"
            type="text"
            value={toneVoice}
            onChange={(e) => setToneVoice(e.target.value)}
            placeholder="How should we sound to the audience? (e.g., Friendly, supportive, professional)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Service and Experience</label>
          <input
            className="input"
            type="text"
            value={serviceExperience}
            onChange={(e) => setServiceExperience(e.target.value)}
            placeholder="What service or journey does this conversation support? (e.g., Travel booking)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Motivations</label>
          <input
            className="input"
            type="text"
            value={motivations}
            onChange={(e) => setMotivations(e.target.value)}
            placeholder="What's driving the user's interaction right now? (e.g., Planning a family vacation)"
          />
        </div>

        <div className="instruction-field-group">
          <label className="label">Frustrations</label>
          <input
            className="input"
            type="text"
            value={frustrations}
            onChange={(e) => setFrustrations(e.target.value)}
            placeholder="What problem are we trying to solve? (e.g., Confusion about fees, hidden costs)"
          />
        </div>

        <div className="generate-section">
          <button
            className="button button-primary"
            onClick={generateInstructions}
            disabled={generating || (!audience.trim() && !values.trim() && !serviceExperience.trim())}
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

