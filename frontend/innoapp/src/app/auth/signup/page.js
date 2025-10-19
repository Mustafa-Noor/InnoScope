'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const { signup } = useAuth();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const result = await signup(formData);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setErrors({ general: result.error || 'An error occurred. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-vh-100 d-flex align-items-center py-5" style={{ 
        backgroundColor: '#ffffff',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.06) 1px, transparent 1px),
          radial-gradient(circle at 80% 70%, rgba(5, 150, 105, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px, 100px 100px'
      }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card shadow-lg border-0" style={{ borderRadius: '16px' }}>
                <div className="card-body p-5">
                  {/* Logo and Title */}
                  <div className="text-center mb-4">
                    <Link href="/" className="text-decoration-none">
                      <h2 className="fw-bold mb-2" style={{ 
                        color: '#059669',
                        fontFamily: 'Poppins, sans-serif'
                      }}>
                        InnoScope
                      </h2>
                    </Link>
                    <h4 className="text-dark mb-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Create Your Account
                    </h4>
                    <p className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Join thousands of innovators transforming business intelligence
                    </p>
                  </div>

                  {/* General Error Message */}
                  {errors.general && (
                    <div className="alert alert-danger" role="alert" style={{ 
                      borderRadius: '12px',
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      {errors.general}
                    </div>
                  )}

                  {/* Signup Form */}
                  <form onSubmit={handleSubmit}>
                    {/* Name Fields */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="firstName" className="form-label" style={{ 
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          First Name
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          style={{ 
                            borderRadius: '12px',
                            padding: '12px 16px',
                            fontFamily: 'Poppins, sans-serif',
                            border: `2px solid ${errors.firstName ? '#dc3545' : '#e5e7eb'}`,
                            transition: 'all 0.2s ease'
                          }}
                        />
                        {errors.firstName && (
                          <div className="invalid-feedback" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {errors.firstName}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="lastName" className="form-label" style={{ 
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Last Name
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          style={{ 
                            borderRadius: '12px',
                            padding: '12px 16px',
                            fontFamily: 'Poppins, sans-serif',
                            border: `2px solid ${errors.lastName ? '#dc3545' : '#e5e7eb'}`,
                            transition: 'all 0.2s ease'
                          }}
                        />
                        {errors.lastName && (
                          <div className="invalid-feedback" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {errors.lastName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label" style={{ 
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        style={{ 
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontFamily: 'Poppins, sans-serif',
                          border: `2px solid ${errors.email ? '#dc3545' : '#e5e7eb'}`,
                          transition: 'all 0.2s ease'
                        }}
                      />
                      {errors.email && (
                        <div className="invalid-feedback" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {errors.email}
                        </div>
                      )}
                    </div>

                    {/* Password Fields */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="password" className="form-label" style={{ 
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Password
                        </label>
                        <input
                          type="password"
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          style={{ 
                            borderRadius: '12px',
                            padding: '12px 16px',
                            fontFamily: 'Poppins, sans-serif',
                            border: `2px solid ${errors.password ? '#dc3545' : '#e5e7eb'}`,
                            transition: 'all 0.2s ease'
                          }}
                        />
                        {errors.password && (
                          <div className="invalid-feedback" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {errors.password}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="confirmPassword" className="form-label" style={{ 
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          style={{ 
                            borderRadius: '12px',
                            padding: '12px 16px',
                            fontFamily: 'Poppins, sans-serif',
                            border: `2px solid ${errors.confirmPassword ? '#dc3545' : '#e5e7eb'}`,
                            transition: 'all 0.2s ease'
                          }}
                        />
                        {errors.confirmPassword && (
                          <div className="invalid-feedback" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {errors.confirmPassword}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="mb-4">
                      <div className="form-check">
                        <input
                          className={`form-check-input ${errors.agreeToTerms ? 'is-invalid' : ''}`}
                          type="checkbox"
                          id="agreeToTerms"
                          name="agreeToTerms"
                          checked={formData.agreeToTerms}
                          onChange={handleInputChange}
                          style={{ 
                            marginTop: '6px',
                            accentColor: '#059669'
                          }}
                        />
                        <label 
                          className="form-check-label" 
                          htmlFor="agreeToTerms"
                          style={{ 
                            fontFamily: 'Poppins, sans-serif',
                            fontSize: '14px',
                            color: '#374151'
                          }}
                        >
                          I agree to the{' '}
                          <Link href="/terms" className="text-decoration-none" style={{ color: '#059669' }}>
                            Terms of Service
                          </Link>
                          {' '}and{' '}
                          <Link href="/privacy" className="text-decoration-none" style={{ color: '#059669' }}>
                            Privacy Policy
                          </Link>
                        </label>
                        {errors.agreeToTerms && (
                          <div className="invalid-feedback d-block" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {errors.agreeToTerms}
                          </div>
                        )}
                      </div>
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
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>

                  {/* Login Link */}
                  <div className="text-center">
                    <span 
                      style={{ 
                        color: '#6b7280',
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '14px'
                      }}
                    >
                      Already have an account?{' '}
                    </span>
                    <Link 
                      href="/auth/login" 
                      className="text-decoration-none fw-semibold"
                      style={{ 
                        color: '#059669',
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    >
                      Sign in
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