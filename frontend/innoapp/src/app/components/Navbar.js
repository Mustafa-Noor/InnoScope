'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div className="container">
        <Link className="navbar-brand fw-bold fs-3" href="/" style={{
          color: '#059669',
          fontFamily: 'Poppins, sans-serif'
        }}>
          InnoScope
        </Link>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link 
                className={`nav-link ${pathname === '/features' ? 'active' : ''}`} 
                href="/features"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Features
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${pathname === '/pricing' ? 'active' : ''}`} 
                href="/pricing"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Pricing
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${pathname === '/contact' ? 'active' : ''}`} 
                href="/contact"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Contact
              </Link>
            </li>
            <li className="nav-item ms-2">
              <Link className="btn" href="/dashboard" style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 20px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '500'
              }}>
                Get Started
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}