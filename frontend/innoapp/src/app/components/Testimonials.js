export default function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO, TechStart",
      content: "InnoScope transformed how we analyze our business data. The insights we've gained have directly contributed to a 40% increase in revenue."
    },
    {
      name: "Michael Chen",
      role: "Data Director, Growth Co",
      content: "The real-time analytics and intuitive dashboards make complex data accessible to our entire team. It's been a game-changer for our decision-making process."
    },
    {
      name: "Emily Rodriguez",
      role: "Marketing Manager, Innovate Inc",
      content: "We've been able to identify trends and opportunities we never saw before. InnoScope's AI-powered insights have revolutionized our marketing strategy."
    }
  ];

  return (
    <section className="section-padding" style={{ backgroundColor: 'white' }}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>What Our Customers Say</h2>
          <p className="lead text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>Trusted by thousands of businesses worldwide</p>
        </div>

        <div className="row g-4">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="col-lg-4 col-md-6">
              <div className="h-100 p-4" style={{
                backgroundColor: 'white',
                border: '2px solid rgba(16, 185, 129, 0.1)',
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
              }}>
                <div className="mb-3">
                  <div style={{ color: '#f59e0b' }}>
                    {'★'.repeat(5)}
                  </div>
                </div>
                <p className="text-muted mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>"{testimonial.content}"</p>
                <div className="d-flex align-items-center">
                  <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{
                    width: '50px', 
                    height: '50px',
                    backgroundColor: '#059669',
                    borderRadius: '15px'
                  }}>
                    <span className="text-white fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{testimonial.name}</h6>
                    <small className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>{testimonial.role}</small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company Trust Indicators */}
        <div className="text-center mt-5">
          <p className="text-muted mb-4">Trusted by industry leaders</p>
          <div className="row justify-content-center">
            <div className="col-auto">
              <span className="badge bg-light text-dark me-2 mb-2">Fortune 500</span>
              <span className="badge bg-light text-dark me-2 mb-2">Startups</span>
              <span className="badge bg-light text-dark me-2 mb-2">Enterprises</span>
              <span className="badge bg-light text-dark me-2 mb-2">SMBs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}