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
    try {
      const res = await fetch(`${API_BASE}/chat/sessions/${sid}/messages`);
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
      let userId = resolveUserId();
      const payload = sessionId ? { session_id: sessionId, message: text } : { message: text };
      if (userId) payload.user_id = Number(userId);

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

  const hasSummaryReply = () => {
    // Check if there's at least one user message and one AI reply (excluding welcome)
    const userMsgs = messages.filter((m) => m.sender === 'user');
    const aiReplies = messages.filter((m) => m.sender === 'ai' && !m.id.toString().startsWith('welcome'));
    return userMsgs.length > 0 && aiReplies.length > 0;
  };

  const sanitizeSummaryLines = (raw) => {
    if (!raw) return [];
    let cleaned = raw;
    cleaned = cleaned.replace(/\*\*/g, '');
    cleaned = cleaned.replace(/`/g, '');
    cleaned = cleaned.replace(/#+\s*/g, '');
    cleaned = cleaned.replace(/\*\s+/g, '• ');
    cleaned = cleaned.replace(/-\s+/g, '• ');
    cleaned = cleaned.replace(/>\s+/g, '');
    cleaned = cleaned.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
    const lines = cleaned
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return lines;
  };

  const buildSimplePdf = (title, summaryLines) => {
    const lines = [title, `Generated: ${new Date().toLocaleString()}`, '', ...summaryLines];
    const escapePdf = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const startX = 50;
    const startY = 760;
    const lineHeight = 18;
    const contentLines = lines.map((line, idx) => `BT /F1 12 Tf ${startX} ${startY - idx * lineHeight} Td (${escapePdf(line)}) Tj ET`).join('\n');
    const stream = `${contentLines}\n`;
    const encoder = new TextEncoder();
    const streamBytes = encoder.encode(stream);
    const contentLength = streamBytes.length;

    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
    const obj4 = `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${stream}endstream\nendobj\n`;
    const obj5 = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

    const pdfParts = ['%PDF-1.4\n', obj1, obj2, obj3, obj4, obj5];

    const offsets = [];
    let cursor = 0;
    pdfParts.forEach((part, idx) => {
      if (idx === 0) {
        cursor += encoder.encode(part).length;
        return;
      }
      offsets.push(cursor);
      cursor += encoder.encode(part).length;
    });

    const xrefStart = cursor;
    const pad = (num) => num.toString().padStart(10, '0');
    const xref = [`xref\n0 6\n0000000000 65535 f \n`];
    offsets.forEach((off) => {
      xref.push(`${pad(off)} 00000 n \n`);
    });

    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const fullPdf = [...pdfParts, ...xref, trailer].join('');
    return new Blob([fullPdf], { type: 'application/pdf' });
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocs = () => {
    const summary = latestAiMessage();
    if (!summary) return;
    const lines = sanitizeSummaryLines(summary);
    const pdf = buildSimplePdf('Research Summary', lines);
    triggerDownload(pdf, 'research_summary.pdf');
  };

  const handleGenerateRoadmap = () => {
    const summary = latestAiMessage();
    if (!summary) return;

    // Create a proper PDF file using jsPDF
    try {
      const jsPDF = require('jspdf').jsPDF;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;
      
      // Add title
      doc.setFontSize(16);
      doc.text('Roadmap Input Summary', margin, margin + 10);
      
      // Add content with word wrapping
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(summary, maxWidth);
      let yPosition = margin + 25;
      
      lines.forEach((line) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });
      
      // Get the PDF as a data URL (base64)
      const pdfDataUrl = doc.output('dataurlstring');
      
      // Store in sessionStorage
      sessionStorage.setItem('roadmap_pdf', pdfDataUrl);
      sessionStorage.setItem('roadmap_filename', 'roadmap_summary.pdf');
      
      // Redirect to roadmap page which will auto-generate
      window.location.href = '/Roadmap?auto=true';
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error preparing roadmap. Please try again.');
    }
  };

  const handleFeasibility = () => {
    const summary = latestAiMessage();
    if (!summary) return;

    // Create a proper PDF file using jsPDF
    try {
      const jsPDF = require('jspdf').jsPDF;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;
      
      // Add title
      doc.setFontSize(16);
      doc.text('Research Summary', margin, margin + 10);
      
      // Add content with word wrapping
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(summary, maxWidth);
      let yPosition = margin + 25;
      
      lines.forEach((line) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });
      
      // Get the PDF as a data URL (base64)
      const pdfDataUrl = doc.output('dataurlstring');
      
      // Store in sessionStorage
      sessionStorage.setItem('feasibility_pdf', pdfDataUrl);
      sessionStorage.setItem('feasibility_filename', 'feasibility_summary.pdf');
      
      // Redirect to feasibility page which will auto-analyze
      window.location.href = '/feasibility?auto=true';
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error preparing feasibility analysis. Please try again.');
    }
  };

  // Note: auth loading removed for local/testing convenience.

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

          {latestAiMessage() && hasSummaryReply() ? (
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button type="button" className="new-chat-btn action-button" onClick={handleDownloadDocs}>
                Get Docs
              </button>
              <button type="button" className="new-chat-btn action-button" onClick={handleGenerateRoadmap}>
                Get Roadmap
              </button>
              <button type="button" className="new-chat-btn action-button" onClick={handleFeasibility} style={{ background: 'rgba(249, 115, 22, 0.3)' }}>
                Analyze Feasibility
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your research question..."
                className="chat-input"
                disabled={sending}
              />
              <button type="submit" className="send-btn" disabled={sending || !inputValue.trim()}>{sending ? 'Sending...' : 'Send'}</button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}