export default function CTA() {
  return (
    <section className="hero-section text-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h2 className="display-5 fw-bold mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="lead mb-5">
              Join thousands of companies that trust InnoScope for their business operations.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <button className="btn btn-light btn-lg px-5">
                Start Your Free Trial Today
              </button>
              <button className="btn btn-outline-light btn-lg px-4">
                Schedule a Demo
              </button>
            </div>
            <div className="mt-4">
              <small className="text-light opacity-75">
                No setup fees • Cancel anytime • 24/7 support
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}