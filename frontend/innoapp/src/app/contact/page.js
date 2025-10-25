'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';

export default function ContactPage() {
  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <main>
    
      <div style={{ paddingTop: '80px' }}>
        {/* Hero Section */}
        <section className="bg-light py-5">
          <div className="container text-center">
            <h1 className="display-4 fw-bold mb-4">Get in Touch</h1>
            <p className="lead text-muted">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </section>

        {/* Contact Form */}
        <section className="section-padding">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="card shadow-sm">
                  <div className="card-body p-5">
                    <form>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="firstName" className="form-label">First Name</label>
                          <input type="text" className="form-control" id="firstName" required />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="lastName" className="form-label">Last Name</label>
                          <input type="text" className="form-control" id="lastName" required />
                        </div>
                        <div className="col-12">
                          <label htmlFor="email" className="form-label">Email</label>
                          <input type="email" className="form-control" id="email" required />
                        </div>
                        <div className="col-12">
                          <label htmlFor="company" className="form-label">Company</label>
                          <input type="text" className="form-control" id="company" />
                        </div>
                        <div className="col-12">
                          <label htmlFor="subject" className="form-label">Subject</label>
                          <select className="form-select" id="subject" required>
                            <option value="">Choose...</option>
                            <option value="sales">Sales Inquiry</option>
                            <option value="support">Technical Support</option>
                            <option value="partnership">Partnership</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label htmlFor="message" className="form-label">Message</label>
                          <textarea className="form-control" id="message" rows="5" required></textarea>
                        </div>
                        <div className="col-12">
                          <button type="submit" className="btn btn-primary btn-lg w-100">
                            Send Message
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="section-padding bg-light">
          <div className="container">
            <div className="row g-4">
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                    <span className="text-white fs-4">📧</span>
                  </div>
                </div>
                <h5 className="fw-bold">Email Us</h5>
                <p className="text-muted">support@innoscope.com</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                    <span className="text-white fs-4">📞</span>
                  </div>
                </div>
                <h5 className="fw-bold">Call Us</h5>
                <p className="text-muted">+1 (555) 123-4567</p>
              </div>
              <div className="col-md-4 text-center">
                <div className="mb-3">
                  <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                    <span className="text-white fs-4">📍</span>
                  </div>
                </div>
                <h5 className="fw-bold">Visit Us</h5>
                <p className="text-muted">123 Business St, Suite 100<br />San Francisco, CA 94105</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}