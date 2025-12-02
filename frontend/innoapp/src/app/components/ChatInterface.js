"use client";
import { useState, useRef, useEffect } from 'react';
import { useAuth } from "../contexts/AuthContext";

export function ChatInterface({ onClose }) {
  const { authFetch, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI research assistant. How can I help you with your research today?",
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions] = useState([
    { id: 1, title: 'Machine Learning Research', date: 'Today' },
    { id: 2, title: 'Climate Change Analysis', date: 'Yesterday' },
    { id: 3, title: 'Quantum Computing Study', date: 'Dec 1' },
    { id: 4, title: 'Neural Networks Overview', date: 'Nov 30' },
    { id: 5, title: 'Data Science Methods', date: 'Nov 29' }
  ]);

  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

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
      const payload = sessionId ? { session_id: sessionId, message: text } : { message: text };
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errText = data?.detail || `Server error: ${res.status}`;
        setMessages((m) => [...m, { id: Date.now()+1, sender: 'ai', text: `Sorry, I couldn't process that. ${errText}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        return;
      }

      if (data?.session_id && !sessionId) setSessionId(data.session_id);
      const reply = data?.reply || data?.message || 'No reply';
      setMessages((m) => [...m, { id: Date.now()+2, sender: 'ai', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now()+3, sender: 'ai', text: `Network error: ${err.message}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setSending(false);
    }
  };

  if (authLoading) return <div>Loading...</div>;

  return (
    <div className="chat-overlay">
      <div className="chat-container">
        {/* Sidebar */}
        <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Chat History</h3>
            <button className="new-chat-btn">+ New Chat</button>
          </div>
          <div className="sessions-list">
            {sessions.map(session => (
              <div key={session.id} className="session-item">
                <div className="session-title">{session.title}</div>
                <div className="session-date">{session.date}</div>
              </div>
            ))}
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
                <div className="message-text">{message.text}</div>
                <div className="message-time">{message.timestamp}</div>
              </div>
            ))}
          </div>

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




// "use client";
// import { useState, useRef, useEffect } from "react";
// import { useAuth } from "../contexts/AuthContext";

// export default function LaymanChatPage() {
//   const { authFetch, isAuthenticated, loading } = useAuth();
//   const [sessionId, setSessionId] = useState(null);
//   const [messages, setMessages] = useState([]); // {sender: 'user'|'assistant', text}
//   const [input, setInput] = useState("");
//   const [sending, setSending] = useState(false);
//   const listRef = useRef(null);

//   useEffect(() => {
//     if (listRef.current) {
//       listRef.current.scrollTop = listRef.current.scrollHeight;
//     }
//   }, [messages]);

//   const sendMessage = async () => {
//     const text = input.trim();
//     if (!text || sending) return;
//     setSending(true);
//     setMessages((m) => [...m, { sender: "user", text }]);
//     setInput("");
//     try {
//       const payload = sessionId
//         ? { session_id: sessionId, message: text }
//         : { message: text, topic: "Product scoping" };
//       const res = await authFetch(
//         `${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/send-message`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(payload),
//         }
//       );
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) {
//         const errText = data?.detail || `Server error: ${res.status}`;
//         setMessages((m) => [
//           ...m,
//           { sender: "assistant", text: `Sorry, I couldn't process that. ${errText}` },
//         ]);
//         return;
//       }
//       if (data?.session_id && !sessionId) setSessionId(data.session_id);
//       setMessages((m) => [...m, { sender: "assistant", text: data?.reply || "" }]);
//     } catch (e) {
//       setMessages((m) => [
//         ...m,
//         { sender: "assistant", text: `Network error: ${e.message}` },
//       ]);
//     } finally {
//       setSending(false);
//     }
//   };

//   const onKeyDown = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   if (loading) return <div>Loading...</div>;
//   if (!isAuthenticated)
//     return (
//       <div>
//         <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#083d44" }}>
//           Layman Chat
//         </h1>
//         <p style={{ color: "#6b7280" }}>Please log in to start chatting.</p>
//       </div>
//     );

//   return (
//     <div>
//       <h1
//         style={{
//           fontSize: "2.5rem",
//           fontWeight: "700",
//           color: "#083d44",
//           marginBottom: "16px",
//           fontFamily: "Poppins, sans-serif",
//         }}
//       >
//         Layman Chat
//       </h1>

//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           height: "70vh",
//           border: "1px solid #e5e7eb",
//           borderRadius: 12,
//           overflow: "hidden",
//           background: "#fff",
//         }}
//       >
//         <div
//           ref={listRef}
//           style={{
//             flex: 1,
//             padding: 16,
//             overflowY: "auto",
//             background: "#f9fafb",
//           }}
//         >
//           {messages.length === 0 ? (
//             <div style={{ color: "#6b7280" }}>
//               Start the conversation with your project idea or context.
//             </div>
//           ) : (
//             messages.map((m, idx) => (
//               <div
//                 key={idx}
//                 style={{
//                   display: "flex",
//                   justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
//                   marginBottom: 8,
//                 }}
//               >
//                 <div
//                   style={{
//                     maxWidth: "75%",
//                     padding: "10px 14px",
//                     borderRadius: 12,
//                     background: m.sender === "user" ? "#10b981" : "#e5e7eb",
//                     color: m.sender === "user" ? "white" : "#111827",
//                     whiteSpace: "pre-wrap",
//                   }}
//                 >
//                   {m.text}
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//         <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e5e7eb" }}>
//           <textarea
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={onKeyDown}
//             placeholder="Type your message..."
//             style={{
//               flex: 1,
//               resize: "none",
//               height: 56,
//               borderRadius: 10,
//               border: "1px solid #d1d5db",
//               padding: 12,
//             }}
//           />
//           <button
//             onClick={sendMessage}
//             disabled={sending || !input.trim()}
//             style={{
//               background: sending ? "#9ca3af" : "#10b981",
//               color: "white",
//               padding: "0 18px",
//               borderRadius: 10,
//               border: "none",
//               fontWeight: 600,
//             }}
//           >
//             {sending ? "Sending..." : "Send"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }