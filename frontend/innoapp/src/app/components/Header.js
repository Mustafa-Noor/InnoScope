export function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo-section">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
              <path d="M8.5 2h7"/>
              <path d="M7 16h10"/>
            </svg>
          </div>
          <span className="brand-name">ResearchAnalytica</span>
        </div>
        <nav className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#about" className="nav-link">About</a>
          <button className="btn-signin">Sign In</button>
        </nav>
      </div>
    </header>
  );
}
