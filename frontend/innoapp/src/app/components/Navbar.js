'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

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
              {isAuthenticated ? (
                <div className="dropdown">
                  <button 
                    className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center" 
                    type="button" 
                    data-bs-toggle="dropdown" 
                    aria-expanded="false"
                    style={{
                      border: '2px solid #e5e7eb',
                      color: '#374151',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div 
                      className="me-2 d-flex align-items-center justify-content-center"
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: '#059669',
                        borderRadius: '50%',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'white'
                      }}
                    >
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </div>
                    {user?.firstName} {user?.lastName}
                  </button>
                  <ul className="dropdown-menu" style={{ borderRadius: '12px' }}>
                    <li>
                      <Link className="dropdown-item" href="/dashboard" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" href="/settings" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Settings
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button 
                        className="dropdown-item" 
                        onClick={logout}
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <>
                  <Link 
                    className="btn btn-outline-secondary me-2" 
                    href="/auth/login" 
                    style={{
                      border: '2px solid #e5e7eb',
                      color: '#374151',
                      borderRadius: '12px',
                      padding: '8px 20px',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Sign In
                  </Link>
                  <Link className="btn" href="/auth/signup" style={{
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
                </>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}