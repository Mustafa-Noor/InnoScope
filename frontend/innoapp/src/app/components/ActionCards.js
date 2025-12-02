"use client";
import { useState } from 'react';
import RoadmapPage from '../Roadmap/page';

export function ActionCards({ onChatClick }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showUploadOverlay, setShowUploadOverlay] = useState(false);

  const handleUploadClick = () => {
    console.log('Navigate to upload interface');
    setShowUploadOverlay(true);
  };

  return (
    <section className="action-cards">
      <div className="container">
        <div className="cards-grid">
          {/* Chat Card */}
          <button
            onClick={onChatClick}
            onMouseEnter={() => setHoveredCard('chat')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`action-card ${hoveredCard === 'chat' ? 'hovered' : ''}`}
          >
            <div className="card-content">
              <div className="icon-wrapper">
                <div className="card-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <h2 className="card-title">Start a Conversation</h2>
              <p className="card-description">
                Engage with our AI research assistant to explore topics, ask questions, 
                and receive instant analytical insights tailored to your needs.
              </p>
              <div className="card-action">
                <span>Begin Chat</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </div>
          </button>

          {/* Upload Card */}
          <button
            onClick={handleUploadClick}
            onMouseEnter={() => setHoveredCard('upload')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`action-card ${hoveredCard === 'upload' ? 'hovered' : ''}`}
          >
            <div className="card-content">
              <div className="icon-wrapper">
                <div className="card-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" x2="12" y1="3" y2="15"/>
                  </svg>
                </div>
              </div>
              <h2 className="card-title">Upload Documents</h2>
              <p className="card-description">
                Upload research papers, reports, or data files for comprehensive analysis 
                and automated insights extraction powered by AI.
              </p>
              <div className="card-action">
                <span>Upload Files</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Features List */}
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h3 className="feature-title">Accurate Analysis</h3>
            <p className="feature-description">Advanced algorithms deliver precise research insights you can trust</p>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              </svg>
            </div>
            <h3 className="feature-title">Secure & Private</h3>
            <p className="feature-description">Your data is encrypted and remains completely confidential</p>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h3 className="feature-title">Fast Processing</h3>
            <p className="feature-description">Get comprehensive results in seconds, not hours or days</p>
          </div>
        </div>
      </div>
      
      {/* Upload overlay: reuse chat overlay styles for consistency */}
      {showUploadOverlay && (
        <div className="chat-overlay" role="dialog" aria-modal="true">
          <div className="chat-container upload-container" style={{ maxWidth: 1200, width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
              <button className="close-chat-btn" onClick={() => setShowUploadOverlay(false)} aria-label="Close upload">
                ×
              </button>
            </div>
            <div className="upload-inner" style={{ padding: 12 }}>
              <RoadmapPage />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
