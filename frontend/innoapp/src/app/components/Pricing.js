export default function Pricing() {
  return (
    <section id="pricing" className="section-padding" style={{ backgroundColor: 'white' }}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Simple Pricing</h2>
          <p className="lead text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>Choose the plan that's right for your business</p>
        </div>
        <div className="row g-4 justify-content-center">
          <div className="col-lg-4 col-md-6">
            <div className="p-4 h-100" style={{
              backgroundColor: 'white',
              border: '2px solid rgba(16, 185, 129, 0.1)',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
            }}>
              <div className="text-center">
                <h4 className="fw-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Starter</h4>
                <div className="mb-4">
                  <span className="display-4 fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>$29</span>
                  <span className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>/month</span>
                </div>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Up to 5 team members</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ 10GB storage</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Basic analytics</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Email support</li>
                </ul>
                <button className="btn w-100" style={{
                  backgroundColor: 'transparent',
                  border: '2px solid #059669',
                  color: '#059669',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: '500'
                }}>Get Started</button>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="p-4 h-100" style={{
              backgroundColor: 'white',
              border: '2px solid #059669',
              borderRadius: '20px',
              boxShadow: '0 8px 30px rgba(5, 150, 105, 0.15)',
              position: 'relative'
            }}>
              <div className="text-center">
                <div className="badge mb-3" style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '12px',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '0.8rem'
                }}>Most Popular</div>
                <h4 className="fw-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Professional</h4>
                <div className="mb-4">
                  <span className="display-4 fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>$79</span>
                  <span className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>/month</span>
                </div>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Up to 25 team members</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ 100GB storage</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Advanced analytics</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Priority support</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ API access</li>
                </ul>
                <button className="btn w-100" style={{
                  backgroundColor: '#059669',
                  border: '2px solid #059669',
                  color: 'white',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: '500'
                }}>Get Started</button>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="p-4 h-100" style={{
              backgroundColor: 'white',
              border: '2px solid rgba(16, 185, 129, 0.1)',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
            }}>
              <div className="text-center">
                <h4 className="fw-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Enterprise</h4>
                <div className="mb-4">
                  <span className="display-4 fw-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>$199</span>
                  <span className="text-muted" style={{ fontFamily: 'Poppins, sans-serif' }}>/month</span>
                </div>
                <ul className="list-unstyled mb-4">
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Unlimited team members</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Unlimited storage</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Custom analytics</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ 24/7 phone support</li>
                  <li className="mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>✓ Custom integrations</li>
                </ul>
                <button className="btn w-100" style={{
                  backgroundColor: 'transparent',
                  border: '2px solid #059669',
                  color: '#059669',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: '500'
                }}>Contact Sales</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}