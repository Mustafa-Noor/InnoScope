export default function Footer() {
  return (
    <footer className="bg-dark text-white py-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-4 mb-4">
            <h5 className="fw-bold gradient-text">InnoScope</h5>
            <p className="text-muted">
              Transforming businesses with innovative SaaS solutions.
            </p>
            <div className="d-flex gap-3 mt-3">
              <a href="#" className="text-light">
                <i className="bi bi-twitter"></i>
              </a>
              <a href="#" className="text-light">
                <i className="bi bi-linkedin"></i>
              </a>
              <a href="#" className="text-light">
                <i className="bi bi-facebook"></i>
              </a>
            </div>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold">Product</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none">Features</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Pricing</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Security</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Updates</a></li>
            </ul>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold">Company</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none">About</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Blog</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Careers</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Press</a></li>
            </ul>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold">Support</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none">Help Center</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Contact</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Status</a></li>
              <li><a href="#" className="text-muted text-decoration-none">API Docs</a></li>
            </ul>
          </div>
          <div className="col-lg-2 col-md-6 mb-4">
            <h6 className="fw-bold">Legal</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-muted text-decoration-none">Privacy</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Terms</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Cookies</a></li>
              <li><a href="#" className="text-muted text-decoration-none">License</a></li>
            </ul>
          </div>
        </div>
        <hr className="my-4" />
        <div className="row align-items-center">
          <div className="col-md-6">
            <p className="text-muted mb-0">
              © 2025 InnoScope. All rights reserved.
            </p>
          </div>
          <div className="col-md-6 text-md-end">
            <p className="text-muted mb-0">
              Made with ❤️ for businesses worldwide
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}