import React, { useState, useEffect } from 'react';
import './FunctionStubManager.css';
import '../styles/shared.css';

function FunctionStubManager() {
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [generatingSchemas, setGeneratingSchemas] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mockInput: null,
    mockResponse: null,
    mockInputText: 'null',
    mockResponseText: 'null'
  });

  // Validate function name format (OpenAI requirement: ^[a-zA-Z0-9_-]+$)
  const validateFunctionName = (name) => {
    if (!name || name.trim() === '') {
      return 'Function name is required';
    }
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(name)) {
      return 'Function name can only contain letters, numbers, underscores (_), and hyphens (-). No spaces or special characters allowed.';
    }
    return null;
  };

  useEffect(() => {
    loadFunctions();
  }, []);

  const loadFunctions = async () => {
    try {
      const response = await fetch('/api/functions');
      if (!response.ok) throw new Error('Failed to load functions');
      const data = await response.json();
      setFunctions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mockInput: null,
      mockResponse: null,
      mockInputText: 'null',
      mockResponseText: 'null'
    });
    setEditingId(null);
    setNameError(null);
    setError(null);
  };

  const startEdit = (func) => {
    const mockInput = func.mockInput !== undefined ? func.mockInput : null;
    const mockResponse = func.mockResponse !== undefined ? func.mockResponse : null;
    setFormData({
      name: func.name,
      description: func.description || '',
      mockInput,
      mockResponse,
      mockInputText: JSON.stringify(mockInput, null, 2),
      mockResponseText: JSON.stringify(mockResponse, null, 2)
    });
    setEditingId(func.id);
    // Validate the function name when editing
    const validationError = validateFunctionName(func.name);
    setNameError(validationError);
    if (validationError) {
      setError(validationError);
    } else {
      setError(null);
    }
  };

  const updateMockInput = (value) => {
    // Update the text version
    setFormData({
      ...formData,
      mockInputText: value
    });
    
    // Try to parse and update the object version if valid
    try {
      const parsed = JSON.parse(value);
      setFormData({
        ...formData,
        mockInputText: value,
        mockInput: parsed
      });
    } catch (e) {
      // Invalid JSON, but keep the text for editing
      // We'll validate on save
    }
  };

  const updateMockResponse = (value) => {
    // Update the text version
    setFormData({
      ...formData,
      mockResponseText: value
    });
    
    // Try to parse and update the object version if valid
    try {
      const parsed = JSON.parse(value);
      setFormData({
        ...formData,
        mockResponseText: value,
        mockResponse: parsed
      });
    } catch (e) {
      // Invalid JSON, but keep the text for editing
      // We'll validate on save
    }
  };

  const saveFunction = async () => {
    try {
      setError(null);
      setNameError(null);

      // Validate function name
      const nameValidationError = validateFunctionName(formData.name);
      if (nameValidationError) {
        setNameError(nameValidationError);
        setError(nameValidationError);
        return;
      }

      // Ensure mock input and response are valid JSON
      let mockInput, mockResponse;
      try {
        mockInput = JSON.parse(formData.mockInputText);
        mockResponse = JSON.parse(formData.mockResponseText);
      } catch (e) {
        setError('Invalid JSON in mock input or mock response. Please check your syntax.');
        return;
      }

      const functionData = {
        name: formData.name,
        description: formData.description || '',
        mockInput,
        mockResponse
      };

      let response;
      if (editingId) {
        response = await fetch(`/api/functions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(functionData)
        });
      } else {
        response = await fetch('/api/functions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(functionData)
        });
      }

      if (!response.ok) throw new Error('Failed to save function');

      resetForm();
      loadFunctions();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteFunction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this function?')) {
      return;
    }

    try {
      const response = await fetch(`/api/functions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete function');
      loadFunctions();
    } catch (err) {
      setError(err.message);
    }
  };

  const generateSchemas = async () => {
    if (!formData.name.trim()) {
      setError('Please enter a function name first');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a function description first');
      return;
    }

    setGeneratingSchemas(true);
    setError(null);

    try {
      const response = await fetch('/api/functions/generate-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          provider: 'openai' // Default to OpenAI, could be made configurable
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate function definition');
      }

      const result = await response.json();
      
      // Update form data with generated mock input and mock response
      setFormData({
        ...formData,
        mockInput: result.mockInput,
        mockResponse: result.mockResponse,
        mockInputText: JSON.stringify(result.mockInput, null, 2),
        mockResponseText: JSON.stringify(result.mockResponse, null, 2)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingSchemas(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading functions...</div>;
  }

  return (
    <div className="function-manager">
      <h2>Function Stubs</h2>
      <p className="section-description">
        Define the functions your assistant will need. These are stubs that help you plan what functions to implement.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="function-form card">
        <h3>{editingId ? 'Edit Function' : 'Add New Function'}</h3>
        
        <div className="form-group">
          <label className="label">Function Name</label>
          <input
            className={`input ${nameError ? 'input-error' : ''}`}
            type="text"
            value={formData.name}
            onChange={(e) => {
              const newName = e.target.value;
              setFormData({ ...formData, name: newName });
              const validationError = validateFunctionName(newName);
              setNameError(validationError);
              if (validationError) {
                setError(validationError);
              } else {
                setError(null);
              }
            }}
            placeholder="e.g., get_weather"
          />
          {nameError && (
            <small className="error-text" style={{ color: '#dc3545', display: 'block', marginTop: '0.25rem' }}>
              {nameError}
            </small>
          )}
          <small className="help-text" style={{ display: 'block', marginTop: '0.25rem', color: '#6c757d' }}>
            Only letters, numbers, underscores (_), and hyphens (-) are allowed
          </small>
        </div>

        <div className="form-group">
          <div className="schema-header">
            <label className="label">Description</label>
            <button 
              className="button button-small button-primary" 
              onClick={generateSchemas}
              disabled={generatingSchemas || !formData.name.trim() || !formData.description.trim()}
              title={!formData.name.trim() || !formData.description.trim() 
                ? 'Please enter function name and description first' 
                : 'Generate mock input and mock response using AI'}
            >
              {generatingSchemas ? 'Generating...' : 'Generate Mock'}
            </button>
          </div>
          <textarea
            className="input"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What does this function do?"
            rows={3}
          />
        </div>

        <div className="form-group">
          <div className="schema-header">
            <label className="label">Mock Input</label>
            <button 
              className="button button-small button-secondary" 
              onClick={() => {
                const example = {
                  customerId: "123456"
                };
                setFormData({ 
                  ...formData, 
                  mockInput: example,
                  mockInputText: JSON.stringify(example, null, 2)
                });
              }}
            >
              Load Example
            </button>
          </div>
          <textarea
            className="input schema-editor"
            value={formData.mockInputText}
            onChange={(e) => updateMockInput(e.target.value)}
            placeholder='{"parameter": "example value"}'
            rows={12}
          />
          <small className="help-text">
            Define example input data that shows what parameters this function accepts. The input schema will be automatically generated from this.
          </small>
        </div>

        <div className="form-group">
          <div className="schema-header">
            <label className="label">Mock Response</label>
            <button 
              className="button button-small button-secondary" 
              onClick={() => {
                const example = {
                  customerId: "123456",
                  name: "John Doe",
                  email: "john.doe@example.com",
                  bookings: [
                    {
                      bookingId: "B001",
                      date: "2024-01-15T10:00:00Z",
                      status: "confirmed"
                    }
                  ],
                  openTrips: [],
                  vouchers: []
                };
                setFormData({ 
                  ...formData, 
                  mockResponse: example,
                  mockResponseText: JSON.stringify(example, null, 2)
                });
              }}
            >
              Load Example
            </button>
          </div>
          <textarea
            className="input schema-editor"
            value={formData.mockResponseText}
            onChange={(e) => updateMockResponse(e.target.value)}
            placeholder='{"result": "example response"}'
            rows={12}
          />
          <small className="help-text">
            Define the mock response that will be returned when this function is called. This should be realistic example data.
          </small>
        </div>

        <div className="form-actions">
          {editingId && (
            <button className="button button-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
          <button className="button button-primary" onClick={saveFunction}>
            {editingId ? 'Update' : 'Add'} Function
          </button>
        </div>
      </div>

      <div className="functions-list">
        <h3>Existing Functions ({functions.length})</h3>
        {functions.length === 0 ? (
          <p className="empty-state">No functions defined yet. Add one above to get started.</p>
        ) : (
          functions.map(func => (
            <div key={func.id} className="function-card card">
              <div className="function-header">
                <h4>{func.name}</h4>
                <div className="function-actions">
                  <button
                    className="button button-small button-secondary"
                    onClick={() => startEdit(func)}
                  >
                    Edit
                  </button>
                  <button
                    className="button button-small button-danger"
                    onClick={() => deleteFunction(func.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {func.description && <p className="function-description">{func.description}</p>}
              <div className="function-details">
                <div className="schema-display">
                  <strong>Mock Input:</strong>
                  <pre className="schema-json">{JSON.stringify(func.mockInput !== undefined ? func.mockInput : (func.inputSchema ? 'Legacy: inputSchema (will be converted)' : null), null, 2)}</pre>
                </div>
                <div className="schema-display">
                  <strong>Mock Response:</strong>
                  <pre className="schema-json">{JSON.stringify(func.mockResponse !== undefined ? func.mockResponse : (func.outputSchema ? 'Legacy: outputSchema (will be converted)' : null), null, 2)}</pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FunctionStubManager;

