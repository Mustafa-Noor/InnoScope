"use client";
import { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ActionCards } from './components/ActionCards';
import { Footer } from './components/Footer';
import { ChatInterface } from './components/ChatInterface';
import './app.css';

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Hero />
        <ActionCards onChatClick={() => setIsChatOpen(true)} />
      </main>
      <Footer />
      
      {isChatOpen && <ChatInterface onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}
