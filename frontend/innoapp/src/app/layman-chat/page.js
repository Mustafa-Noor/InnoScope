"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LaymanChatPage() {
  const { authFetch, isAuthenticated, loading } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // {sender: 'user'|'assistant', text}
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setMessages((m) => [...m, { sender: "user", text }]);
    setInput("");
    try {
      const payload = sessionId
        ? { session_id: sessionId, message: text }
        : { message: text, topic: "Product scoping" };
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/send-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errText = data?.detail || `Server error: ${res.status}`;
        setMessages((m) => [
          ...m,
          { sender: "assistant", text: `Sorry, I couldn't process that. ${errText}` },
        ]);
        return;
      }
      if (data?.session_id && !sessionId) setSessionId(data.session_id);
      setMessages((m) => [...m, { sender: "assistant", text: data?.reply || "" }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { sender: "assistant", text: `Network error: ${e.message}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated)
    return (
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#083d44" }}>
          Layman Chat
        </h1>
        <p style={{ color: "#6b7280" }}>Please log in to start chatting.</p>
      </div>
    );

  return (
    <div>
      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: "700",
          color: "#083d44",
          marginBottom: "16px",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        Layman Chat
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "70vh",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          ref={listRef}
          style={{
            flex: 1,
            padding: 16,
            overflowY: "auto",
            background: "#f9fafb",
          }}
        >
          {messages.length === 0 ? (
            <div style={{ color: "#6b7280" }}>
              Start the conversation with your project idea or context.
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: m.sender === "user" ? "#10b981" : "#e5e7eb",
                    color: m.sender === "user" ? "white" : "#111827",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e5e7eb" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message..."
            style={{
              flex: 1,
              resize: "none",
              height: 56,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              padding: 12,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              background: sending ? "#9ca3af" : "#10b981",
              color: "white",
              padding: "0 18px",
              borderRadius: 10,
              border: "none",
              fontWeight: 600,
            }}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}