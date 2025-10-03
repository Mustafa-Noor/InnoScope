export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#f8f9fa', color: '#374151' }} className="py-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-4 mb-4">
            <h5 className="fw-bold" style={{ color: '#059669', fontFamily: 'Poppins, sans-serif' }}>InnoScope</h5>
            <p className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Transforming businesses with innovative SaaS solutions.
            </p>
            <div className="d-flex gap-3 mt-3">
              <a href="#" style={{ color: '#059669' }}>
                <i className="bi bi-twitter"></i>
              </a>
              <a href="#" style={{ color: '#059669' }}>
                <i className="bi bi-linkedin"></i>
              </a>
              <a href="#" style={{ color: '#059669' }}>
                <i className="bi bi-facebook"></i>
              </a>
            </div>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Product</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Features</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Pricing</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Security</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Updates</a></li>
            </ul>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Company</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>About</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Blog</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Careers</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Press</a></li>
            </ul>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Support</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Help Center</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Contact</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Status</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>API Docs</a></li>
            </ul>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Legal</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Privacy</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Terms</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Cookies</a></li>
              <li><a href="#" className="text-muted text-decoration-none" style={{ fontFamily: 'Poppins, sans-serif' }}>License</a></li>
            </ul>
          </div>
        </div>
        <hr className="my-4" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }} />
        <div className="row align-items-center">
          <div className="col-md-6">
            <p className="text-muted mb-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
              © 2025 InnoScope. All rights reserved.
            </p>
          </div>
          <div className="col-md-6 text-md-end">
            <p className="text-muted mb-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Made with ❤️ for businesses worldwide
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}