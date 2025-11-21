import React, { useState, useEffect } from 'react';
import './ExportPanel.css';
import '../styles/shared.css';

function ExportPanel() {
  const [instructions, setInstructions] = useState(null);
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [instructionsRes, functionsRes] = await Promise.all([
        fetch('/api/instructions', { credentials: 'include' }),
        fetch('/api/functions', { credentials: 'include' })
      ]);

      if (instructionsRes.ok) {
        const instructionsData = await instructionsRes.json();
        setInstructions(instructionsData);
      }

      if (functionsRes.ok) {
        const functionsData = await functionsRes.json();
        setFunctions(functionsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    const data = {
      instructions: instructions?.content || '',
      functions: functions,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant-design-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    let markdown = '# AI Assistant Design\n\n';
    
    // Format date like: 07/11/2025, 13:06:16
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    markdown += `*Exported on ${day}/${month}/${year}, ${hours}:${minutes}:${seconds}*\n\n`;

    markdown += '## Instructions\n\n';
    if (instructions?.content) {
      // Format instructions as numbered list if they contain numbered items
      const content = instructions.content.trim();
      // Check if it's already formatted as a numbered list
      if (/^\d+\./.test(content.split('\n')[0])) {
        // Split by lines and format each numbered item
        const lines = content.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            markdown += line.trim() + '\n\n';
          }
        });
      } else {
        // Just output the content as-is
        markdown += content + '\n\n';
      }
    } else {
      markdown += '*No instructions defined*\n\n';
    }

    markdown += '## Functions\n\n';
    if (functions.length === 0) {
      markdown += '*No functions defined*\n\n';
    } else {
      functions.forEach((func, idx) => {
        markdown += `### ${idx + 1}. ${func.name}\n\n`;
        if (func.description) {
          markdown += `${func.description}\n\n`;
        }
        
        markdown += '**Mock Input:**\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(func.mockInput !== undefined ? func.mockInput : (func.inputSchema ? 'Legacy: inputSchema' : null), null, 2);
        markdown += '\n```\n\n';
        
        markdown += '**Input Schema:**\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(func.inputSchema || {}, null, 2);
        markdown += '\n```\n\n';
        
        markdown += '**Mock Response:**\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(func.mockResponse !== undefined ? func.mockResponse : (func.outputSchema ? 'Legacy: outputSchema' : null), null, 2);
        markdown += '\n```\n\n';
        
        markdown += '**Output Schema:**\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(func.outputSchema || {}, null, 2);
        markdown += '\n```\n\n';
      });
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant-design-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (format) => {
    try {
      let text = '';
      
      if (format === 'json') {
        const data = {
          instructions: instructions?.content || '',
          functions: functions,
          exportedAt: new Date().toISOString()
        };
        text = JSON.stringify(data, null, 2);
      } else {
        // Markdown
        text = '# AI Assistant Design\n\n';
        
        // Format date like: 07/11/2025, 13:06:16
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        text += `*Exported on ${day}/${month}/${year}, ${hours}:${minutes}:${seconds}*\n\n`;
        
        text += '## Instructions\n\n';
        if (instructions?.content) {
          const content = instructions.content.trim();
          if (/^\d+\./.test(content.split('\n')[0])) {
            const lines = content.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                text += line.trim() + '\n\n';
              }
            });
          } else {
            text += content + '\n\n';
          }
        } else {
          text += '*No instructions defined*\n\n';
        }
        
        text += '## Functions\n\n';
        if (functions.length === 0) {
          text += '*No functions defined*\n\n';
        } else {
          functions.forEach((func, idx) => {
            text += `### ${idx + 1}. ${func.name}\n\n`;
            if (func.description) text += `${func.description}\n\n`;
            
            text += '**Mock Input:**\n\n';
            text += '```json\n';
            text += JSON.stringify(func.mockInput !== undefined ? func.mockInput : (func.inputSchema ? 'Legacy: inputSchema' : null), null, 2);
            text += '\n```\n\n';
            
            text += '**Input Schema:**\n\n';
            text += '```json\n';
            text += JSON.stringify(func.inputSchema || {}, null, 2);
            text += '\n```\n\n';
            
            text += '**Mock Response:**\n\n';
            text += '```json\n';
            text += JSON.stringify(func.mockResponse !== undefined ? func.mockResponse : (func.outputSchema ? 'Legacy: outputSchema' : null), null, 2);
            text += '\n```\n\n';
            
            text += '**Output Schema:**\n\n';
            text += '```json\n';
            text += JSON.stringify(func.outputSchema || {}, null, 2);
            text += '\n```\n\n';
          });
        }
      }

      await navigator.clipboard.writeText(text);
      setCopied(format);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  const hasData = (instructions?.content && instructions.content.trim()) || functions.length > 0;

  return (
    <div className="export-panel">
      <h2>Export Design</h2>
      <p className="section-description">
        Export your assistant design as JSON or Markdown documentation. Share with your team or use as a reference.
      </p>

      {!hasData && (
        <div className="warning-message">
          No data to export. Add instructions and functions first.
        </div>
      )}

      <div className="export-options">
        <div className="export-card card">
          <h3>JSON Export</h3>
          <p>Export as structured JSON data. Perfect for importing into other tools or version control.</p>
          <div className="export-actions">
            <button
              className="button button-primary"
              onClick={exportJSON}
              disabled={!hasData}
            >
              Download JSON
            </button>
            <button
              className="button button-secondary"
              onClick={() => copyToClipboard('json')}
              disabled={!hasData}
            >
              {copied === 'json' ? '✓ Copied' : 'Copy JSON'}
            </button>
          </div>
        </div>

        <div className="export-card card">
          <h3>Markdown Export</h3>
          <p>Export as Markdown documentation. Great for sharing with non-technical team members or documentation.</p>
          <div className="export-actions">
            <button
              className="button button-primary"
              onClick={exportMarkdown}
              disabled={!hasData}
            >
              Download Markdown
            </button>
            <button
              className="button button-secondary"
              onClick={() => copyToClipboard('markdown')}
              disabled={!hasData}
            >
              {copied === 'markdown' ? '✓ Copied' : 'Copy Markdown'}
            </button>
          </div>
        </div>
      </div>

      <div className="export-preview card">
        <h3>Preview</h3>
        <div className="preview-content">
          <div className="preview-section">
            <strong>Instructions:</strong>{' '}
            {instructions?.content ? (
              <span className="preview-text">{instructions.content.substring(0, 100)}...</span>
            ) : (
              <span className="preview-empty">None</span>
            )}
          </div>
          <div className="preview-section">
            <strong>Functions:</strong>{' '}
            <span className="preview-count">{functions.length}</span>
            {functions.length > 0 && (
              <ul className="preview-functions">
                {functions.map(func => (
                  <li key={func.id}>
                    <code>{func.name}</code>
                    {func.description && <span> - {func.description.substring(0, 50)}...</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportPanel;

