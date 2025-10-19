'use client';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, requireAuth = true }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // Redirect to home (which will show auth UI when not signed in)
        router.push('/');
      } else if (!requireAuth && user) {
        // Redirect to dashboard if user is logged in but trying to access auth pages
        router.push('/dashboard');
      }
    }
  }, [user, loading, requireAuth, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="text-center">
          <div className="spinner-border" style={{ color: '#059669' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Don't render children if auth requirements are not met
  if (requireAuth && !user) {
    return null;
  }

  if (!requireAuth && user) {
    return null;
  }

  return children;
}