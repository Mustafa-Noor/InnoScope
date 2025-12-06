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
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending) return;

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
                placeholder="Type your research question..."
                disabled={sending}
              />
              <button type="submit" className="send-btn" disabled={sending || !inputValue.trim()}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}