export default function Hero() {
  return (
    <section className="hero-section text-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <h1 className="display-4 fw-bold mb-4">
              Transform Your Business with InnoScope
            </h1>
            <p className="lead mb-5">
              The all-in-one SaaS platform that streamlines your workflow, boosts productivity, and scales with your business. Join thousands of companies already using InnoScope.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <button className="btn btn-light btn-lg px-4">
                Start Free Trial
              </button>
              <button className="btn btn-outline-light btn-lg px-4">
                Watch Demo
              </button>
            </div>
            <div className="mt-4">
              <small className="text-light opacity-75">
                No credit card required • 14-day free trial • Cancel anytime
              </small>
            </div>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="row mt-5 text-center">
          <div className="col-md-4">
            <div className="h3 fw-bold">10K+</div>
            <div className="text-light opacity-75">Active Users</div>
          </div>
          <div className="col-md-4">
            <div className="h3 fw-bold">99.9%</div>
            <div className="text-light opacity-75">Uptime</div>
          </div>
          <div className="col-md-4">
            <div className="h3 fw-bold">24/7</div>
            <div className="text-light opacity-75">Support</div>
          </div>
        </div>
      </div>
    </section>
  )
}