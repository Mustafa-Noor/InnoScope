'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic email validation
    if (!email.trim()) {
      setError('Email address is required');
      setIsLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || 'An error occurred. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
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
                        style={{
                          color: '#059669',
                          fontFamily: 'Poppins, sans-serif'
                        }}
                      >
                        InnoScope
                      </h2>
                    </Link>

                    {!isSubmitted ? (
                      <>
                        <h4 className="text-dark mb-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Forgot Password?
                        </h4>
                        <p className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          No worries, we'll send you reset instructions
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mb-3">
                          <div className="d-flex justify-content-center">
                            <div
                              className="d-flex align-items-center justify-content-center"
                              style={{
                                width: '60px',
                                height: '60px',
                                backgroundColor: '#d1fae5',
                                borderRadius: '50%'
                              }}
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  stroke="#059669"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <h4 className="text-dark mb-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Check Your Email
                        </h4>
                        <p className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          We sent a password reset link to {email}
                        </p>
                      </>
                    )}
                  </div>

                  {!isSubmitted ? (
                    <>
                      {/* Error Message */}
                      {error && (
                        <div
                          className="alert alert-danger"
                          role="alert"
                          style={{
                            borderRadius: '12px',
                            fontFamily: 'Poppins, sans-serif'
                          }}
                        >
                          {error}
                        </div>
                      )}

                      {/* Reset Form */}
                      <form onSubmit={handleSubmit}>
                        <div className="mb-4">
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
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (error) setError('');
                            }}
                            placeholder="Enter your email address"
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

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="btn w-100 text-white fw-semibold mb-4"
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
                              Sending...
                            </>
                          ) : (
                            'Send Reset Instructions'
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      {/* Success Actions */}
                      <div className="mb-4">
                        <p
                          className="text-muted text-center"
                          style={{
                            fontFamily: 'Poppins, sans-serif',
                            fontSize: '14px'
                          }}
                        >
                          Didn't receive the email? Check your spam folder or{' '}
                          <button
                            type="button"
                            className="btn btn-link p-0"
                            onClick={() => {
                              setIsSubmitted(false);
                              setEmail('');
                            }}
                            style={{
                              color: '#059669',
                              fontFamily: 'Poppins, sans-serif',
                              fontSize: '14px',
                              textDecoration: 'none'
                            }}
                          >
                            try again
                          </button>
                        </p>
                      </div>

                      <button
                        onClick={() => window.open('mailto:', '_blank')}
                        className="btn w-100 text-white fw-semibold mb-4"
                        style={{
                          backgroundColor: '#059669',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px',
                          fontFamily: 'Poppins, sans-serif',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = '#047857';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 15px rgba(5, 150, 105, 0.3)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = '#059669';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        Open Email App
                      </button>
                    </>
                  )}

                  {/* Back to Login Link */}
                  <div className="text-center">
                    <Link
                      href="/auth/login"
                      className="text-decoration-none d-inline-flex align-items-center"
                      style={{
                        color: '#6b7280',
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '14px',
                        transition: 'color 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.color = '#059669';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.color = '#6b7280';
                      }}
                    >
                      <svg
                        className="me-2"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m12 19-7-7 7-7" />
                        <path d="M19 12H5" />
                      </svg>
                      Back to sign in
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
