"use client";
import { useEffect, useRef, useState } from 'react';

const createWelcomeMessage = () => ({
  id: `welcome-${Date.now()}`,
  text: "Hello! I'm your AI research assistant. How can I help you with your research today?",
  sender: 'ai',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const coerceUserId = (raw) => {
  if (raw === undefined || raw === null) return null;
  const num = Number(raw);
  if (Number.isFinite(num) && Number.isInteger(num) && num > 0) return String(num);
  return null;
};

const formatMessageText = (text, sender) => {
  if (sender !== 'ai') return text;
  
  let formatted = text;
  
  // Convert markdown headings
  formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Convert inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert bullet lists
  formatted = formatted.replace(/^\* (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Convert numbered lists
  formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Convert line breaks to paragraphs
  const paragraphs = formatted.split(/\n\n+/).map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<ol') || p.trim().startsWith('<li')) {
      return p;
    }
    return p.trim() ? `<p>${p.trim()}</p>` : '';
  }).filter(p => p);
  
  return paragraphs.join('\n');
};

export function ChatInterface({ onClose }) {
  const BUILT_IN_API_KEY = process.env.NEXT_PUBLIC_TEST_API_KEY || 'test-api-key';
  // Default to localhost backend for local development when env is not set
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const resolveUserId = () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id) return coerceUserId(parsed.id);
      return null;
    } catch (e) {
      return null;
    }
  };

  const fetchSessions = async () => {
    const userId = resolveUserId() || '1';
    try {
      const url = new URL(`${API_BASE}/chat/sessions`);
      url.searchParams.set('user_id', userId);
      console.log('Fetching sessions from:', url.toString());
      
      const res = await fetch(url.toString());
      console.log('Sessions response status:', res.status);
      
      if (!res.ok) {
        console.error('Failed to fetch sessions:', res.status, res.statusText);
        setSessions([]);
        return;
      }
      
      const data = await res.json();
      console.log('Sessions data:', data);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching sessions', err);
      setSessions([]);
    }
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    setMessages([]);
    setActiveResult(null);
    setSummaryResult(null);
    setRoadmapResult(null);
    setFeasibilityResult(null);
    setGeneratingResult(null);
    setGeneratingProgress(0);
    setGeneratingMessage('');
    try {
      const userId = resolveUserId() || '1';
      const url = new URL(`${API_BASE}/chat/sessions/${sid}/messages`);
      url.searchParams.set('user_id', userId);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      const formatted = (data || []).map((m, idx) => ({
        id: m.id ?? `${sid}-${idx}`,
        sender: m.sender === 'assistant' ? 'ai' : m.sender,
        text: m.message || '',
        timestamp: m.created_at ? formatTimestamp(m.created_at) : '',
      }));
      setMessages(formatted.length ? formatted : [createWelcomeMessage()]);
    } catch (err) {
      console.error('Error loading session messages', err);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([createWelcomeMessage()]);
    setActiveResult(null);
    setSummaryResult(null);
    setRoadmapResult(null);
    setFeasibilityResult(null);
    setGeneratingResult(null);
    setGeneratingProgress(0);
    setGeneratingMessage('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending) return;

    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((m) => [...m, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      let userId = resolveUserId() || '1';  // Always have a user_id, default to '1'
      const payload = sessionId ? { session_id: sessionId, message: text, user_id: userId } : { message: text, user_id: userId };

      // Prefer an actual auth token stored by AuthContext, otherwise fall back to built-in key
      let authToken = BUILT_IN_API_KEY;
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) authToken = storedToken;
      } catch (e) { /* ignore */ }

      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      let res;
      try {
        res = await fetch(`${API_BASE}/chat/send-message`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        // If the authenticated endpoint is unreachable, try the dev endpoint without auth as a fallback
        try {
          res = await fetch(`${API_BASE}/dev/chat/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (devErr) {
          throw networkErr; // rethrow original network error
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errText = data?.detail || `Server error: ${res.status}`;
        setMessages((m) => [...m, { id: Date.now()+1, sender: 'ai', text: `Sorry, I couldn't process that. ${errText}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        return;
      }

      if (data?.session_id && !sessionId) setSessionId(data.session_id);
      fetchSessions();

      const reply = data?.reply || data?.message || 'No reply';
      setMessages((m) => [...m, { id: Date.now()+2, sender: 'ai', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

      // Check if chat is complete
      if (data?.is_complete) {
        setChatComplete(true);
        setExtractedData({
          summary: data.summary || '',
          problem_statement: data.problem_statement || '',
          domain: data.domain || '',
          goals: data.goals || [],
          prerequisites: data.prerequisites || [],
          key_topics: data.key_topics || [],
        });
      }
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now()+3, sender: 'ai', text: `Network error: ${err.message}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setSending(false);
    }
  };

  const latestAiMessage = () => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === 'ai' && messages[i].text) return messages[i].text;
    }
    return null;
  };

  const [chatComplete, setChatComplete] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);
  const [roadmapResult, setRoadmapResult] = useState(null);
  const [feasibilityResult, setFeasibilityResult] = useState(null);
  const [generatingResult, setGeneratingResult] = useState(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingMessage, setGeneratingMessage] = useState('');

  const generateSummary = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult('summary');
    try {
      const res = await fetch(`${API_BASE}/summarize/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedData.summary }),
      });
      const data = await res.json();
      setSummaryResult(data.summary || 'No summary generated');
      setActiveResult('summary');
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Summary error:', error);
      setSummaryResult(`Error: ${error.message}`);
    } finally {
      setGeneratingResult(null);
    }
  };

  const generateRoadmap = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult('roadmap');
    try {
      const res = await fetch(`${API_BASE}/roadmap/generate-from-summary-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: extractedData.summary }),
      });

      const reader = res.body.getReader();
      let result = null;
      let buffer = '';
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const json = JSON.parse(line.slice(6));
              if (currentEvent === 'complete') {
                result = json;
              } else if (currentEvent === 'status') {
                // Show progress updates in UI
                if (json.progress) {
                  setGeneratingProgress(json.progress);
                }
                if (json.message) {
                  setGeneratingMessage(json.message);
                }
                console.log(`[Roadmap] ${json.stage || 'working'}: ${json.message} (${json.progress || 0}%)`);
              }
            } catch (e) {}
          }
        }
      }

      setRoadmapResult(result);
      setActiveResult('roadmap');
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Roadmap error:', error);
      setRoadmapResult({ error: error.message });
    } finally {
      setGeneratingResult(null);
    }
  };

  const generateFeasibility = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult('feasibility');
    try {
      const res = await fetch(`${API_BASE}/feasibility/assess-from-summary-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: extractedData.summary }),
      });

      const reader = res.body.getReader();
      let result = null;
      let buffer = '';
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const json = JSON.parse(line.slice(6));
              if (currentEvent === 'complete') {
                result = json;
              } else if (currentEvent === 'status') {
                // Show progress updates in UI
                if (json.progress) {
                  setGeneratingProgress(json.progress);
                }
                if (json.message) {
                  setGeneratingMessage(json.message);
                }
                console.log(`[Feasibility] ${json.stage || 'working'}: ${json.message} (${json.progress || 0}%)`);
              }
            } catch (e) {}
          }
        }
      }

      setFeasibilityResult(result);
      setActiveResult('feasibility');
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Feasibility error:', error);
      setFeasibilityResult({ error: error.message });
    } finally {
      setGeneratingResult(null);
    }
  };

  const formatRoadmap = (roadmapData) => {
    if (!roadmapData) return null;
    
    // If roadmap is a string (markdown), render it as-is
    if (typeof roadmapData === 'string') {
      return (
        <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '14px', lineHeight: '1.6', color: '#1f2937' }}>
          {roadmapData.split('\n').map((line, idx) => (
            <div key={idx} style={{
              marginBottom: line.trim() === '' ? '12px' : '4px',
              paddingLeft: line.startsWith('##') ? '0px' : line.startsWith('###') ? '16px' : line.startsWith('**') ? '32px' : '0px',
              fontWeight: line.startsWith('#') ? '600' : 'normal',
              fontSize: line.startsWith('###') ? '15px' : line.startsWith('##') ? '17px' : '14px',
              color: line.startsWith('###') ? '#0369a1' : line.startsWith('##') ? '#1e40af' : '#374151'
            }}>
              {line}
            </div>
          ))}
        </div>
      );
    }
    
    // If roadmap is an object, format it
    if (typeof roadmapData === 'object') {
      const { roadmap, message, status } = roadmapData;
      return (
        <div>
          {message && <p style={{ color: '#059669', marginBottom: '12px', fontWeight: '500' }}>{message}</p>}
          {roadmap && (
            <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '13px', lineHeight: '1.7', color: '#1f2937' }}>
              {roadmap.split('\n').map((line, idx) => (
                <div key={idx} style={{
                  marginBottom: line.trim() === '' ? '12px' : '2px',
                  paddingLeft: line.startsWith('###') ? '16px' : line.startsWith('##') ? '0px' : line.startsWith('**') ? '32px' : '0px',
                  fontWeight: line.startsWith('##') ? '600' : line.startsWith('**') ? '500' : 'normal',
                  fontSize: line.startsWith('##') ? '16px' : '13px',
                  color: line.startsWith('##') ? '#1e40af' : line.startsWith('###') ? '#0369a1' : '#374151'
                }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <pre style={{ fontSize: '12px' }}>{JSON.stringify(roadmapData, null, 2)}</pre>;
  };

  const formatFeasibility = (feasibilityData) => {
    if (!feasibilityData) return null;
    
    // If it's a string, render as-is
    if (typeof feasibilityData === 'string') {
      return (
        <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '14px', lineHeight: '1.6', color: '#1f2937' }}>
          {feasibilityData}
        </div>
      );
    }
    
    // If it's an object, try different field combinations
    if (typeof feasibilityData === 'object') {
      const { 
        final_score, 
        explanation, 
        detailed_report,
        sub_scores,
        recommendations,
        message,
        feasibility_score,
        assessment,
        feasibility_assessment 
      } = feasibilityData;
      
      // Use available score field
      const score = final_score || feasibility_score;
      // Use available report/assessment field
      const report = detailed_report || explanation || assessment || feasibility_assessment;
      
      return (
        <div>
          {message && <p style={{ color: '#059669', marginBottom: '12px', fontWeight: '500' }}>{message}</p>}
          {score && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #86efac' }}>
              <span style={{ fontWeight: '600', color: '#047857' }}>Feasibility Score: </span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>{score}%</span>
            </div>
          )}
          {sub_scores && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>Sub-Scores:</div>
              <div style={{ paddingLeft: '12px' }}>
                {Object.entries(sub_scores).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px', fontSize: '13px', color: '#475569' }}>
                    <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}: </span>
                    {typeof value === 'object' ? value.score : value}%
                  </div>
                ))}
              </div>
            </div>
          )}
          {report && (
            <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '13px', lineHeight: '1.7', color: '#1f2937' }}>
              {typeof report === 'string' ? (
                report.split('\n').map((line, idx) => (
                  <div key={idx} style={{
                    marginBottom: line.trim() === '' ? '12px' : '2px',
                    paddingLeft: line.startsWith('##') ? '0px' : line.startsWith('###') ? '16px' : line.startsWith('**') ? '32px' : '0px',
                    fontWeight: line.startsWith('##') ? '600' : line.startsWith('**') ? '500' : 'normal',
                    fontSize: line.startsWith('##') ? '16px' : line.startsWith('###') ? '14px' : '13px',
                    color: line.startsWith('##') ? '#7c2d12' : line.startsWith('###') ? '#b45309' : '#78350f'
                  }}>
                    {line}
                  </div>
                ))
              ) : (
                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(report, null, 2)}</pre>
              )}
            </div>
          )}
          {recommendations && recommendations.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>Recommendations:</div>
              <ul style={{ paddingLeft: '20px', margin: '0' }}>
                {recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginBottom: '6px', fontSize: '13px', color: '#475569' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
          {!report && !score && !message && (
            <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(feasibilityData, null, 2)}</pre>
          )}
        </div>
      );
    }
    
    return <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(feasibilityData, null, 2)}</pre>;
  };

  return (
    <div className="chat-overlay">
      <div className="chat-container">
        {/* Sidebar */}
        <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Chat History ({sessions.length})</h3>
            <button className="new-chat-btn" onClick={startNewChat} type="button">+ New Chat</button>
          </div>
          <div className="sessions-list">
            {sessions.length === 0 ? (
              <div className="session-item" style={{ cursor: 'default' }}>
                <div className="session-info">
                  <div className="session-title">No chat sessions yet.</div>
                  <div className="session-date">Start a new conversation to see it here.</div>
                </div>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-item ${sessionId === session.id ? 'active' : ''}`}
                  onClick={() => loadSession(session.id)}
                >
                  <div className="session-icon">💬</div>
                  <div className="session-info">
                    <div className="session-title">{session.title || 'Untitled Chat'}</div>
                    <div className="session-date">{formatTimestamp(session.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="chat-main">
          <div className="chat-header">
            <div>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
              <h2>AI Research Assistant</h2>
            </div>
            <button onClick={onClose}>✖</button>
          </div>

          <div className="messages-area" ref={listRef}>
            {messages.map(message => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div 
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: formatMessageText(message.text, message.sender) }}
                />
                <div className="message-time">{message.timestamp}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons When Chat Complete */}
          {chatComplete && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderTop: '1px solid #dcfce7',
              flexWrap: 'wrap'
            }} data-result-panel>
              <button
                onClick={generateSummary}
                disabled={generatingResult === 'summary'}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === 'summary' ? '#10b981' : '#e0f2fe',
                  color: activeResult === 'summary' ? 'white' : '#0369a1',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
              >
                {generatingResult === 'summary' ? 'Generating...' : '📄 Summary'}
              </button>
              <button
                onClick={generateRoadmap}
                disabled={generatingResult === 'roadmap'}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === 'roadmap' ? '#3b82f6' : '#f0f9ff',
                  color: activeResult === 'roadmap' ? 'white' : '#0c4a6e',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {generatingResult === 'roadmap' && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${generatingProgress}%`,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    transition: 'width 0.3s'
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {generatingResult === 'roadmap' ? `Generating... ${generatingProgress}%` : '🗺️ Roadmap'}
                </span>
              </button>
              <button
                onClick={generateFeasibility}
                disabled={generatingResult === 'feasibility'}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === 'feasibility' ? '#f59e0b' : '#fef3c7',
                  color: activeResult === 'feasibility' ? 'white' : '#92400e',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {generatingResult === 'feasibility' && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${generatingProgress}%`,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    transition: 'width 0.3s'
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {generatingResult === 'feasibility' ? `Analyzing... ${generatingProgress}%` : '✓ Feasibility'}
                </span>
              </button>
            </div>
          )}

          {/* Progress Message - Show while generating */}
          {generatingResult && generatingMessage && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#e0f2fe',
              borderLeft: '4px solid #0369a1',
              marginBottom: '12px',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#0c4a6e',
              fontWeight: '500',
              opacity: 0.9
            }}>
              ⏳ {generatingMessage}
            </div>
          )}

          {/* Results Panel */}
          {activeResult && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              maxHeight: '600px',
              overflowY: 'auto'
            }} data-result-panel>
              {activeResult === 'summary' && summaryResult && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Summary</h3>
                  <p style={{ color: '#475569', lineHeight: '1.6' }}>{summaryResult}</p>
                </div>
              )}
              {activeResult === 'roadmap' && roadmapResult && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e40af' }}>🗺️ Implementation Roadmap</h3>
                  {formatRoadmap(roadmapResult)}
                </div>
              )}
              {activeResult === 'feasibility' && feasibilityResult && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#92400e' }}>✓ Feasibility Analysis</h3>
                  {formatFeasibility(feasibilityResult)}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={chatComplete ? 'Chat complete. Choose an option below.' : 'Type your research question...'}
                className="chat-input"
                disabled={sending || chatComplete}
              />
              <button type="submit" className="send-btn" disabled={sending || !inputValue.trim() || chatComplete}>{sending ? 'Sending...' : 'Send'}</button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}