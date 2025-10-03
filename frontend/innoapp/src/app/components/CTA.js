import Link from 'next/link';

export default function CTA() {
  return (
    <section className="text-center py-5" style={{
      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      color: 'white'
    }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h2 className="display-5 fw-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Ready to Transform Your Business?
            </h2>
            <p className="lead mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Join thousands of companies that trust InnoScope for their business operations.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link href="/dashboard" className="btn btn-lg px-5" style={{
                backgroundColor: 'white',
                color: '#059669',
                border: 'none',
                borderRadius: '15px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '500'
              }}>
                Start Your Free Trial Today
              </Link>
              <Link href="/contact" className="btn btn-lg px-4" style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                borderRadius: '15px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '500'
              }}>
                Schedule a Demo
              </Link>
            </div>
            <div className="mt-4">
              <small style={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontFamily: 'Poppins, sans-serif'
              }}>
                No setup fees • Cancel anytime • 24/7 support
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}