export default function Pricing() {
  return (
    <section id="pricing" className="section-padding">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-3">Simple Pricing</h2>
          <p className="lead text-muted">Choose the plan that's right for your business</p>
        </div>
        <div className="row g-4 justify-content-center">
          <div className="col-lg-4 col-md-6">
            <div className="pricing-card p-4 h-100">
              <div className="text-center">
                <h4 className="fw-bold mb-3">Starter</h4>
                <div className="mb-4">
                  <span className="display-4 fw-bold">$29</span>
                  <span className="text-muted">/month</span>
                </div>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2">✓ Up to 5 team members</li>
                  <li className="mb-2">✓ 10GB storage</li>
                  <li className="mb-2">✓ Basic analytics</li>
                  <li className="mb-2">✓ Email support</li>
                </ul>
                <button className="btn btn-outline-primary w-100">Get Started</button>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="pricing-card featured p-4 h-100">
              <div className="text-center">
                <div className="badge bg-primary mb-3">Most Popular</div>
                <h4 className="fw-bold mb-3">Professional</h4>
                <div className="mb-4">
                  <span className="display-4 fw-bold">$79</span>
                  <span className="text-muted">/month</span>
                </div>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2">✓ Up to 25 team members</li>
                  <li className="mb-2">✓ 100GB storage</li>
                  <li className="mb-2">✓ Advanced analytics</li>
                  <li className="mb-2">✓ Priority support</li>
                  <li className="mb-2">✓ API access</li>
                </ul>
                <button className="btn btn-primary w-100">Get Started</button>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="pricing-card p-4 h-100">
              <div className="text-center">
                <h4 className="fw-bold mb-3">Enterprise</h4>
                <div className="mb-4">
                  <span className="display-4 fw-bold">$199</span>
                  <span className="text-muted">/month</span>
                </div>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2">✓ Unlimited team members</li>
                  <li className="mb-2">✓ Unlimited storage</li>
                  <li className="mb-2">✓ Custom analytics</li>
                  <li className="mb-2">✓ 24/7 phone support</li>
                  <li className="mb-2">✓ Custom integrations</li>
                </ul>
                <button className="btn btn-outline-primary w-100">Contact Sales</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}