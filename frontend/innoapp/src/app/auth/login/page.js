'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value.trimStart()
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.email.trim(), formData.password);
      if (result?.success) {
        router.push('/dashboard');
      } else {
        setError(result?.error || 'Invalid email or password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div
        className="min-vh-100 d-flex align-items-center"
        style={{
          backgroundColor: '#ffffff',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.06) 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, rgba(5, 150, 105, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 100px 100px'
        }}
      >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
              <div className="card shadow-lg border-0" style={{ borderRadius: '16px' }}>
                <div className="card-body p-5">

                  {/* Logo and Title */}
                  <div className="text-center mb-4">
                    <Link href="/" className="text-decoration-none">
                      <h2
                        className="fw-bold mb-2"
                        style={{ color: '#059669', fontFamily: 'Poppins, sans-serif' }}
                      >
                        InnoScope
                      </h2>
                    </Link>
                    <h4 className="text-dark mb-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Welcome Back
                    </h4>
                    <p className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Sign in to your account
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div
                      className="alert alert-danger"
                      role="alert"
                      style={{ borderRadius: '12px', fontFamily: 'Poppins, sans-serif' }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Login Form */}
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label
                        htmlFor="email"
                        className="form-label"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: '500',
                          color: '#374151'
                        }}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="you@example.com"
                        style={{
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontFamily: 'Poppins, sans-serif',
                          border: '2px solid #e5e7eb',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#10b981';
                          e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor="password"
                        className="form-label"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: '500',
                          color: '#374151'
                        }}
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your password"
                        style={{
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontFamily: 'Poppins, sans-serif',
                          border: '2px solid #e5e7eb',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#10b981';
                          e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div className="d-flex justify-content-end mb-4">
                      <Link
                        href="/auth/forgot-password"
                        className="text-decoration-none"
                        style={{
                          color: '#059669',
                          fontFamily: 'Poppins, sans-serif',
                          fontSize: '14px'
                        }}
                      >
                        Forgot your password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn w-100 text-white fw-semibold"
                      style={{
                        backgroundColor: '#059669',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px',
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!isLoading) {
                          e.target.style.backgroundColor = '#047857';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 15px rgba(5, 150, 105, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isLoading) {
                          e.target.style.backgroundColor = '#059669';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {isLoading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Signing In...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>

                  {/* Sign Up Link */}
                  <div className="text-center mt-4">
                    <span
                      style={{
                        color: '#6b7280',
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '14px'
                      }}
                    >
                      Don’t have an account?{' '}
                    </span>
                    <Link
                      href="/auth/signup"
                      className="text-decoration-none fw-semibold"
                      style={{
                        color: '#059669',
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    >
                      Sign up
                    </Link>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
