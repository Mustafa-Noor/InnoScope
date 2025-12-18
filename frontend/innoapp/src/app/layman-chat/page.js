"use client";
import { useEffect, useRef, useState } from "react";

const createWelcomeMessage = () => ({
  id: `welcome-${Date.now()}`,
  text: "Hello! I'm your AI research assistant. How can I help you with your research today?",
  sender: "ai",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
});

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const coerceUserId = (raw) => {
  if (raw === undefined || raw === null) return null;
  const num = Number(raw);
  if (Number.isFinite(num) && Number.isInteger(num) && num > 0) return String(num);
  return null;
};

export default function LaymanChatPage() {
  const BUILT_IN_API_KEY = process.env.NEXT_PUBLIC_TEST_API_KEY || "test-api-key";
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sending, setSending] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [chatLocked, setChatLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feasibilityData, setFeasibilityData] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
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
      const stored = localStorage.getItem("user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id) return coerceUserId(parsed.id);
      return null;
    } catch (e) {
      return null;
    }
  };

  const fetchSessions = async () => {
    const userId = resolveUserId() || "1";
    try {
      const url = new URL(`${API_BASE}/chat/sessions`);
      url.searchParams.set("user_id", userId);
      const res = await fetch(url.toString());
      if (!res.ok) {
        setSessions([]);
        return;
      }
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching sessions", err);
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
        sender: m.sender === "assistant" ? "ai" : m.sender,
        text: m.message || "",
        timestamp: m.created_at ? formatTimestamp(m.created_at) : "",
      }));
      setMessages(formatted.length ? formatted : [createWelcomeMessage()]);
    } catch (err) {
      console.error("Error loading session messages", err);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([createWelcomeMessage()]);
    setInputValue("");
    setUserMessageCount(0);
    setChatLocked(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending || chatLocked) return;

    // Check if user has reached 2-message limit
    if (userMessageCount >= 2) {
      setChatLocked(true);
      return;
    }

    const now = new Date();
    const userMessage = {
      id: `user-${now.getTime()}`,
      text,
      sender: "user",
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setSending(true);
    setUserMessageCount((prev) => prev + 1);

    try {
      const userId = resolveUserId();
      const payload = sessionId ? { session_id: sessionId, message: text } : { message: text };
      if (userId) payload.user_id = Number(userId);

      let authToken = BUILT_IN_API_KEY;
      try {
        const storedToken = localStorage.getItem("token");
        if (storedToken) authToken = storedToken;
      } catch (e) {
        /* ignore */
      }

      const headers = { "Content-Type": "application/json" };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      let res;
      try {
        res = await fetch(`${API_BASE}/chat/send-message`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        try {
          res = await fetch(`${API_BASE}/dev/chat/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (devErr) {
          throw networkErr;
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errText = data?.detail || `Server error: ${res.status}`;
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "ai",
            text: `Sorry, I couldn't process that. ${errText}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }

      if (data?.session_id && !sessionId) {
        setSessionId(data.session_id);
      }
      fetchSessions();

      const reply = data?.reply || data?.message || "No reply";
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `net-${Date.now()}`,
          sender: "ai",
          text: `Network error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setSending(false);
      
      // After 2nd message, trigger analysis
      if (userMessageCount === 2) {
        setTimeout(() => triggerConversationAnalysis(), 500);
      }
    }
  };

      
      // After 2nd message, trigger analysis
      if (userMessageCount === 2) {
        setTimeout(() => triggerConversationAnalysis(), 500);
      }
    }
  };

  const triggerConversationAnalysis = async () => {
    try {
      setIsGenerating(true);
      setStatusUpdates([]);
      
      // Create conversation summary
      const conversationText = messages
        .filter(m => m.sender === "user")
        .map(m => m.text)
        .join("\n\n");
      
      if (!conversationText) return;

      console.log("Starting conversation analysis...");
      console.log("Conversation text:", conversationText);

      // First, summarize the conversation
      setStatusUpdates(prev => [...prev, "📝 Summarizing conversation..."]);
      
      const summaryRes = await fetch(`${API_BASE}/summarize/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: conversationText }),
      });

      if (!summaryRes.ok) throw new Error("Failed to summarize conversation");
      const summaryData = await summaryRes.json();
      const conversationSummary = summaryData.summary || conversationText;
      
      setStatusUpdates(prev => [...prev, "✓ Summary generated"]);
      console.log("Summary:", conversationSummary);

      // Now run feasibility analysis with streaming
      setStatusUpdates(prev => [...prev, "🔍 Analyzing feasibility..."]);
      
      const feasRes = await fetch(`${API_BASE}/feasibility/from-summary-streaming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: conversationSummary }),
      });

      if (!feasRes.ok) throw new Error("Feasibility stream failed");

      const reader = feasRes.body.getReader();
      let feasData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.event === "complete") {
                feasData = json.data;
                console.log("Feasibility complete:", feasData);
              }
              if (json.data?.status) {
                setStatusUpdates(prev => [...prev, `📊 ${json.data.status}`]);
              }
            } catch (e) {}
          }
        }
      }

      setFeasibilityData(feasData);
      setStatusUpdates(prev => [...prev, "✓ Feasibility analysis complete"]);

      // Now run roadmap generation with streaming
      setStatusUpdates(prev => [...prev, "🗺️ Generating roadmap..."]);
      
      const roadmapRes = await fetch(`${API_BASE}/roadmap/from-summary-streaming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: conversationSummary }),
      });

      if (!roadmapRes.ok) throw new Error("Roadmap stream failed");

      const roadmapReader = roadmapRes.body.getReader();
      let roadmapDataResult = null;

      while (true) {
        const { done, value } = await roadmapReader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.event === "complete") {
                roadmapDataResult = json.data;
                console.log("Roadmap complete:", roadmapDataResult);
              }
              if (json.data?.status) {
                setStatusUpdates(prev => [...prev, `🗺️ ${json.data.status}`]);
              }
            } catch (e) {}
          }
        }
      }

      setRoadmapData(roadmapDataResult);
      setStatusUpdates(prev => [...prev, "✓ Roadmap generated"]);
      setShowSummary(true);

    } catch (error) {
      console.error("Analysis error:", error);
      setStatusUpdates(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ padding: "24px 12px" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
          Layman Chat
        </h1>
        <p style={{ color: "#475569" }}>Ask questions and keep track of your past sessions in one place.</p>
      </div>

      <div className="chat-container" style={{ position: "relative", margin: "0 auto" }}>
        <aside className={`chat-sidebar ${isSidebarOpen ? "" : "closed"}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">Chat History ({sessions.length})</div>
            <button className="new-chat-btn" onClick={startNewChat} type="button">
              + New Chat
            </button>
          </div>

          <div className="sessions-list">
            {sessions.length === 0 ? (
              <div className="session-item" style={{ cursor: "default" }}>
                <div className="session-info">
                  <div className="session-title">No chat sessions yet.</div>
                  <div className="session-date">Start a new conversation to see it here.</div>
                </div>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-item ${sessionId === session.id ? "active" : ""}`}
                  onClick={() => loadSession(session.id)}
                >
                  <div className="session-icon">💬</div>
                  <div className="session-info">
                    <div className="session-title">{session.title || "Untitled Chat"}</div>
                    <div className="session-date">{formatTimestamp(session.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-header-left">
              <button
                className="sidebar-toggle"
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle chat history"
              >
                ☰
              </button>
              <div className="chat-header-info">
                <div className="chat-header-title">AI Research Assistant</div>
                <div className="chat-status">
                  <span className="status-indicator" />
                  <span>Always-on help</span>
                </div>
              </div>
            </div>
            <button className="close-chat-btn" type="button" onClick={startNewChat} title="Start new chat">
              ↻
            </button>
          </div>

          <div className="messages-area" ref={listRef}>
            <div className="messages-container">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender === "user" ? "user" : "ai"}`}>
                  <div className="message-avatar">{message.sender === "user" ? "U" : "AI"}</div>
                  <div className="message-content">
                    <div className="message-text">{message.text}</div>
                    {message.timestamp ? <div className="message-time">{message.timestamp}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <div className="input-wrapper">
              <input
                type="text"
                className="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={chatLocked ? "Chat limit reached. See options below." : "Type your research question..."}
                disabled={sending || chatLocked}
              />
              <button type="submit" className="send-btn" disabled={sending || !inputValue.trim() || chatLocked}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>

          {/* Status Updates During Generation */}
          {isGenerating && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              borderTop: '1px solid #bfdbfe',
              maxHeight: '150px',
              overflowY: 'auto',
              fontSize: '13px',
              color: '#1e40af',
              fontFamily: 'Poppins, sans-serif'
            }}>
              {statusUpdates.map((update, idx) => (
                <div key={idx} style={{ marginBottom: '6px' }}>{update}</div>
              ))}
            </div>
          )}

          {/* Results Display When Ready */}
          {chatLocked && showSummary && !isGenerating && (feasibilityData || roadmapData) && (
            <div style={{
              padding: '20px',
              backgroundColor: '#f0f9ff',
              borderTop: '1px solid #bfdbfe',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 16, color: '#0c4a6e', fontFamily: 'Poppins' }}>
                📊 Analysis Results
              </h3>

              {feasibilityData && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e0e7ff' }}>
                  <h4 style={{ marginTop: 0, marginBottom: 8, color: '#3730a3' }}>Feasibility Assessment</h4>
                  <div style={{ fontSize: '14px', color: '#475569' }}>
                    <div><strong>Score:</strong> {feasibilityData.final_score || 'N/A'}%</div>
                    <div><strong>Status:</strong> {feasibilityData.viability_status || 'N/A'}</div>
                    {feasibilityData.summary && (
                      <div style={{ marginTop: 8, lineHeight: 1.5 }}>
                        <strong>Summary:</strong> {feasibilityData.summary}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {roadmapData && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #dcfce7' }}>
                  <h4 style={{ marginTop: 0, marginBottom: 8, color: '#166534' }}>Implementation Roadmap</h4>
                  <div style={{ fontSize: '14px', color: '#475569' }}>
                    <div><strong>Timeline:</strong> {roadmapData.timeline || 'N/A'}</div>
                    <div><strong>Phases:</strong> {roadmapData.phases?.length || 0}</div>
                    {roadmapData.phases && roadmapData.phases.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: '12px' }}>
                        {roadmapData.phases.slice(0, 3).map((phase, idx) => (
                          <div key={idx} style={{ marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid #10b981' }}>
                            <strong>{phase.name}:</strong> {phase.duration}
                          </div>
                        ))}
                        {roadmapData.phases.length > 3 && (
                          <div style={{ marginTop: 4, color: '#6b7280' }}>+{roadmapData.phases.length - 3} more phases</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={startNewChat}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  marginTop: 12
                }}
              >
                ↻ Start New Analysis
              </button>
            </div>
          )}

          {/* Navigation Options When Chat Locked (No Results Yet) */}
          {chatLocked && !showSummary && !isGenerating && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              padding: '20px',
              backgroundColor: '#f0fdf4',
              borderTop: '1px solid #dcfce7',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => window.location.href = '/Roadmap'}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                → Generate Roadmap
              </button>
              <button
                onClick={() => window.location.href = '/feasibility'}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                → Analyze Feasibility
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}