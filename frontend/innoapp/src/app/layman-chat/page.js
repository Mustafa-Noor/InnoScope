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
  const [chatComplete, setChatComplete] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [activeResult, setActiveResult] = useState(null); // "summary", "roadmap", or "feasibility"
  const [summaryResult, setSummaryResult] = useState(null);
  const [roadmapResult, setRoadmapResult] = useState(null);
  const [feasibilityResult, setFeasibilityResult] = useState(null);
  const [generatingResult, setGeneratingResult] = useState(null); // which result is loading
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingMessage, setGeneratingMessage] = useState("");
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
    setActiveResult(null);
    setSummaryResult(null);
    setRoadmapResult(null);
    setFeasibilityResult(null);
    setGeneratingResult(null);
    setGeneratingProgress(0);
    setGeneratingMessage("");
    try {
      const userId = resolveUserId() || "1";
      const url = new URL(`${API_BASE}/chat/sessions/${sid}/messages`);
      url.searchParams.set("user_id", userId);
      const res = await fetch(url.toString());
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
    setChatComplete(false);
    setExtractedData(null);
    setActiveResult(null);
    setSummaryResult(null);
    setRoadmapResult(null);
    setFeasibilityResult(null);
    setGeneratingResult(null);
    setGeneratingProgress(0);
    setGeneratingMessage("");
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

      // Check if chat is complete
      if (data?.is_complete) {
        setChatComplete(true);
        setExtractedData({
          summary: data.summary || "",
          problem_statement: data.problem_statement || "",
          domain: data.domain || "",
          goals: data.goals || [],
          prerequisites: data.prerequisites || [],
          key_topics: data.key_topics || [],
        });
      }
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
    }
  };

  const generateSummary = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult("summary");
    try {
      const res = await fetch(`${API_BASE}/summarize/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedData.summary }),
      });
      const data = await res.json();
      setSummaryResult(data.summary || "No summary generated");
      setActiveResult("summary");
      // Scroll to results
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Summary error:", error);
      setSummaryResult(`Error: ${error.message}`);
    } finally {
      setGeneratingResult(null);
    }
  };

  const generateRoadmap = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult("roadmap");
    try {
      const res = await fetch(`${API_BASE}/roadmap/generate-from-summary-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: extractedData.summary }),
      });

      const reader = res.body.getReader();
      let result = null;
      let buffer = "";
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split("\n");
        
        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const json = JSON.parse(line.slice(6));
              if (currentEvent === "complete") {
                result = json;
              } else if (currentEvent === "status") {
                // Show progress updates in UI
                console.log(`[Roadmap] ${json.stage || 'working'}: ${json.message} (${json.progress || 0}%)`);
                setGeneratingProgress(json.progress || 0);
                setGeneratingMessage(json.message || `Processing... ${json.progress || 0}%`);
              }
            } catch (e) {}
          }
        }
      }

      setRoadmapResult(result);
      setActiveResult("roadmap");
      // Scroll to results
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Roadmap error:", error);
      setRoadmapResult({ error: error.message });
    } finally {
      setGeneratingResult(null);
    }
  };

  const generateFeasibility = async () => {
    if (!extractedData?.summary) return;
    setGeneratingResult("feasibility");
    try {
      const res = await fetch(`${API_BASE}/feasibility/assess-from-summary-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: extractedData.summary }),
      });

      const reader = res.body.getReader();
      let result = null;
      let buffer = "";
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split("\n");
        
        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const json = JSON.parse(line.slice(6));
              if (currentEvent === "complete") {
                result = json;
              } else if (currentEvent === "status") {
                // Show progress updates in UI
                console.log(`[Feasibility] ${json.stage || 'working'}: ${json.message} (${json.progress || 0}%)`);
                setGeneratingProgress(json.progress || 0);
                setGeneratingMessage(json.message || `Processing... ${json.progress || 0}%`);
              }
            } catch (e) {}
          }
        }
      }

      setFeasibilityResult(result);
      setActiveResult("feasibility");
      // Scroll to results
      setTimeout(() => {
        document.querySelector('[data-result-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Feasibility error:", error);
      setFeasibilityResult({ error: error.message });
    } finally {
      setGeneratingResult(null);
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
                placeholder={chatComplete ? "Chat complete. Choose an option below." : "Type your research question..."}
                disabled={sending || chatComplete}
              />
              <button type="submit" className="send-btn" disabled={sending || !inputValue.trim() || chatComplete}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>

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
            }}>
              <button
                onClick={generateSummary}
                disabled={generatingResult === "summary"}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === "summary" ? '#10b981' : '#e0f2fe',
                  color: activeResult === "summary" ? 'white' : '#0369a1',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
              >
                {generatingResult === "summary" ? "Generating..." : "📄 Summary"}
              </button>
              <button
                onClick={generateRoadmap}
                disabled={generatingResult === "roadmap"}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === "roadmap" ? '#3b82f6' : '#f0f9ff',
                  color: activeResult === "roadmap" ? 'white' : '#0c4a6e',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
              >
                {generatingResult === "roadmap" ? "Generating..." : "🗺️ Roadmap"}
              </button>
              <button
                onClick={generateFeasibility}
                disabled={generatingResult === "feasibility"}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeResult === "feasibility" ? '#f59e0b' : '#fef3c7',
                  color: activeResult === "feasibility" ? 'white' : '#92400e',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
              >
                {generatingResult === "feasibility" ? "Analyzing..." : "✓ Feasibility"}
              </button>
            </div>
          )}

          {/* Progress Message Display */}
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

          {/* Result Display */}
          {chatComplete && activeResult && (
            <div data-result-panel style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              maxHeight: '600px',
              overflowY: 'auto',
              fontFamily: 'Poppins, sans-serif'
            }}>
              {activeResult === "summary" && summaryResult && (
                <div>
                  <h4 style={{ marginTop: 0, color: '#1e293b' }}>📄 Research Summary</h4>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {typeof summaryResult === 'string' ? summaryResult : JSON.stringify(summaryResult, null, 2)}
                  </div>
                </div>
              )}

              {activeResult === "roadmap" && roadmapResult && (
                <div>
                  <h4 style={{ marginTop: 0, color: '#1e293b' }}>🗺️ Implementation Roadmap</h4>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                    {roadmapResult.error ? (
                      <div style={{ color: '#dc2626' }}>Error: {roadmapResult.error}</div>
                    ) : (
                      <>
                        <div><strong>Timeline:</strong> {roadmapResult.timeline || 'N/A'}</div>
                        <div style={{ marginTop: 12 }}>
                          <strong>Phases ({roadmapResult.phases?.length || 0}):</strong>
                          {roadmapResult.phases?.slice(0, 5).map((phase, idx) => (
                            <div key={idx} style={{ marginTop: 8, paddingLeft: 12, borderLeft: '3px solid #3b82f6' }}>
                              <strong>{phase.name}</strong>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: 4 }}>
                                Duration: {phase.duration}
                              </div>
                            </div>
                          ))}
                          {roadmapResult.phases?.length > 5 && (
                            <div style={{ marginTop: 8, color: '#64748b', fontSize: '12px' }}>
                              +{roadmapResult.phases.length - 5} more phases
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeResult === "feasibility" && feasibilityResult && (
                <div>
                  <h4 style={{ marginTop: 0, color: '#1e293b' }}>✓ Feasibility Analysis</h4>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                    {feasibilityResult.error ? (
                      <div style={{ color: '#dc2626' }}>Error: {feasibilityResult.error}</div>
                    ) : (
                      <>
                        {(feasibilityResult.final_score !== undefined || feasibilityResult.feasibility_score !== undefined) && (
                          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #86efac' }}>
                            <span style={{ fontWeight: '600', color: '#047857' }}>Feasibility Score: </span>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
                              {feasibilityResult.final_score || feasibilityResult.feasibility_score}%
                            </span>
                          </div>
                        )}
                        {feasibilityResult.viability_status && (
                          <div style={{ marginBottom: '12px' }}>
                            <strong>Status:</strong> {feasibilityResult.viability_status}
                          </div>
                        )}
                        {feasibilityResult.sub_scores && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Sub-Scores:</div>
                            <div style={{ paddingLeft: '12px' }}>
                              {Object.entries(feasibilityResult.sub_scores).map(([key, value]) => (
                                <div key={key} style={{ marginBottom: '4px', fontSize: '13px' }}>
                                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}: </span>
                                  {typeof value === 'object' ? value.score : value}%
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(feasibilityResult.detailed_report || feasibilityResult.explanation || feasibilityResult.summary) && (
                          <div style={{ marginTop: 12, padding: 12, backgroundColor: 'white', borderRadius: 6, border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                            <strong>Report:</strong>
                            <div style={{ marginTop: 6 }}>{feasibilityResult.detailed_report || feasibilityResult.explanation || feasibilityResult.summary}</div>
                          </div>
                        )}
                        {feasibilityResult.recommendations && feasibilityResult.recommendations.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Recommendations:</div>
                            <ul style={{ paddingLeft: '20px', margin: '0' }}>
                              {feasibilityResult.recommendations.map((rec, idx) => (
                                <li key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={startNewChat}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#64748b',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                ↻ Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}