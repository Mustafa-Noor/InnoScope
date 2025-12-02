export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-content">
        <div className="badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/>
            <path d="M19 17v4"/>
            <path d="M3 5h4"/>
            <path d="M17 19h4"/>
          </svg>
          <span>Powered by Advanced AI</span>
        </div>
        
        <h1 className="hero-title">
          <span className="title-line">Advanced Research Analysis</span>
          <span className="title-gradient">Made Simple</span>
        </h1>
        
        <p className="hero-subtitle">
          Transform your research workflow with intelligent analysis tools.
        </p>
        <p className="hero-description">
          Chat with our AI assistant or upload your documents for comprehensive insights.
        </p>
      </div>
    </section>
  );
}
