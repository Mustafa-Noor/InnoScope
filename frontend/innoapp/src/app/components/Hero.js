import Link from 'next/link';

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="container position-relative" style={{ zIndex: 2 }}>
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center">
            
            {/* Clean heading with emerald accent */}
            <h1 className="mb-4" style={{
              fontSize: '3rem',
              fontWeight: '600',
              lineHeight: '1.1',
              color: '#064e3b',
              letterSpacing: '-0.025em',
              fontFamily: 'Poppins, sans-serif'
            }}>
              AI research assistant
            </h1>
            
            {/* Subtitle */}
            <p className="mb-5" style={{
              fontSize: '1.25rem',
              color: '#065f46',
              lineHeight: '1.6',
              maxWidth: '600px',
              margin: '0 auto 2.5rem auto',
              opacity: 0.8,
              fontFamily: 'Poppins, sans-serif'
            }}>
              InnoScope helps you find answers in research papers, extract key insights, and accelerate your research workflow with AI.
            </p>
            
            {/* Clean CTA buttons with emerald theme and rounded borders */}
            <div className="mb-5">
              <Link 
                href="/dashboard" 
                className="btn btn-lg px-5 py-3 me-3 mb-3"
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 15px rgba(5, 150, 105, 0.2)',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                Get started for free
              </Link>
              <Link 
                href="/features" 
                className="btn btn-lg px-5 py-3 mb-3"
                style={{
                  backgroundColor: 'white',
                  color: '#065f46',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                See how it works
              </Link>
            </div>

            {/* Trust indicators - Elicit style */}
            <div className="d-flex justify-content-center align-items-center gap-4 flex-wrap" style={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              fontFamily: 'Poppins, sans-serif'
            }}>
              <span>Free to start</span>
              <span>•</span>
              <span>No credit card required</span>
              <span>•</span>
              <span>Used by 200k+ researchers</span>
            </div>
            
          </div>
        </div>

        {/* Demo/Preview section with emerald theme */}
        <div className="row justify-content-center mt-5">
          <div className="col-lg-10">
            <div className="p-4" style={{
              backgroundColor: 'white',
              border: '2px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '20px',
              boxShadow: '0 8px 30px rgba(16, 185, 129, 0.1)'
            }}>
              {/* Search bar mockup with emerald accent */}
              <div className="mb-4">
                <div className="position-relative">
                  <input 
                    type="text" 
                    className="form-control form-control-lg"
                    placeholder="What effects does creatine have on cognition?"
                    readOnly
                    style={{
                      backgroundColor: 'white',
                      border: '2px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '15px',
                      fontSize: '1rem',
                      padding: '15px 60px 15px 20px',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                  <button 
                    className="btn position-absolute"
                    style={{
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontSize: '0.875rem',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: '500'
                    }}
                  >
                    Search
                  </button>
                </div>
              </div>
              
              {/* Results preview */}
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="p-3" style={{
                    backgroundColor: 'white',
                    border: '2px solid rgba(16, 185, 129, 0.1)',
                    borderRadius: '15px',
                    height: '120px',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.05)'
                  }}>
                    <div className="d-flex align-items-center mb-2">
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#10b981',
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}></div>
                      <small className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>High confidence</small>
                    </div>
                    <h6 className="mb-2" style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      Cognitive Enhancement
                    </h6>
                    <p className="text-muted mb-0" style={{ 
                      fontSize: '0.75rem', 
                      lineHeight: '1.4',
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      Creatine supplementation shows positive effects on working memory and processing speed...
                    </p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3" style={{
                    backgroundColor: 'white',
                    border: '2px solid rgba(245, 158, 11, 0.1)',
                    borderRadius: '15px',
                    height: '120px',
                    boxShadow: '0 2px 10px rgba(245, 158, 11, 0.05)'
                  }}>
                    <div className="d-flex align-items-center mb-2">
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#f59e0b',
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}></div>
                      <small className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>Medium confidence</small>
                    </div>
                    <h6 className="mb-2" style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      Dosage Effects
                    </h6>
                    <p className="text-muted mb-0" style={{ 
                      fontSize: '0.75rem', 
                      lineHeight: '1.4',
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      Studies suggest 3-5g daily dosage for optimal cognitive benefits...
                    </p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3" style={{
                    backgroundColor: 'white',
                    border: '2px solid rgba(107, 114, 128, 0.1)',
                    borderRadius: '15px',
                    height: '120px',
                    boxShadow: '0 2px 10px rgba(107, 114, 128, 0.05)'
                  }}>
                    <div className="d-flex align-items-center mb-2">
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#6b7280',
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}></div>
                      <small className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>Mixed evidence</small>
                    </div>
                    <h6 className="mb-2" style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      Long-term Effects
                    </h6>
                    <p className="text-muted mb-0" style={{ 
                      fontSize: '0.75rem', 
                      lineHeight: '1.4',
                      fontFamily: 'Poppins, sans-serif'
                    }}>
                      Limited research on long-term cognitive impacts requires further study...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}