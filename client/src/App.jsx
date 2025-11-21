import React, { useState, useEffect } from 'react';
import InstructionEditor from './components/InstructionEditor';
import FunctionStubManager from './components/FunctionStubManager';
import ApiKeyManager from './components/ApiKeyManager';
import ConversationPanel from './components/ConversationPanel';
import ExportPanel from './components/ExportPanel';
import './styles/App.css';
import './styles/shared.css';

function App() {
  const [activeTab, setActiveTab] = useState('instructions');
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Fetch session ID on mount
    fetch('/api/session', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSessionId(data.sessionId))
      .catch(err => console.error('Failed to fetch session ID:', err));
  }, []);

  const configTabs = [
    { id: 'instructions', label: 'Instructions', icon: '📝' },
    { id: 'functions', label: 'Functions', icon: '⚙️' },
    { id: 'api-keys', label: 'API Keys', icon: '🔑' }
  ];

  const mainTabs = [
    { id: 'conversation', label: 'Test Conversation', icon: '💬' },
    { id: 'export', label: 'Export', icon: '📤' }
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <img
              src="https://brand.holidayextras.com/assets/downloads/02-logos/web-svg/holiday-extras-horizontal-web.svg"
              alt="Holiday Extras"
              className="logo"
            />
          </div>
          <div className="header-text">
            <h1>Conversational Design Starter</h1>
            <p>Design and test your AI assistant</p>
          </div>
          {sessionId && (
            <div className="session-info">
              <span className="session-label">Session:</span>
              <code className="session-id">{sessionId.substring(0, 8)}</code>
            </div>
          )}
        </div>
      </header>
      
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h2 className="sidebar-title">Configuration</h2>
            <nav className="sidebar-nav">
              {configTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="sidebar-icon">{tab.icon}</span>
                  <span className="sidebar-label">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="sidebar-section">
            <h2 className="sidebar-title">Actions</h2>
            <nav className="sidebar-nav">
              {mainTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="sidebar-icon">{tab.icon}</span>
                  <span className="sidebar-label">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="app-main">
          {activeTab === 'instructions' && <InstructionEditor />}
          {activeTab === 'functions' && <FunctionStubManager />}
          {activeTab === 'api-keys' && <ApiKeyManager />}
          {activeTab === 'conversation' && <ConversationPanel />}
          {activeTab === 'export' && <ExportPanel />}
        </main>
      </div>
    </div>
  );
}

export default App;

