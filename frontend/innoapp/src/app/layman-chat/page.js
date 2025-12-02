"use client";
import { useState } from 'react';

export default function ChatInterface({ onClose }) {
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: "I understand your question. Let me analyze that for you. This is a simulated response.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

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

          <div className="messages-area">
            {messages.map(message => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-text">{message.text}</div>
                <div className="message-time">{message.timestamp}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your research question..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
