'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Pricing from '../components/Pricing';
import Footer from '../components/Footer';

export default function PricingPage() {
  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <main>
      <Navbar />
      <div style={{ paddingTop: '80px' }}>
        {/* Hero Section for Pricing */}
        <section className="bg-light py-5">
          <div className="container text-center">
            <h1 className="display-4 fw-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="lead text-muted">
              Choose the perfect plan for your business. Upgrade or downgrade at any time.
            </p>
          </div>
        </section>
        
        <Pricing />
        
        {/* FAQ Section */}
        <section className="section-padding bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fw-bold">Frequently Asked Questions</h2>
            </div>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="accordion" id="pricingFAQ">
                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                        Can I change my plan anytime?
                      </button>
                    </h2>
                    <div id="faq1" className="accordion-collapse collapse show" data-bs-parent="#pricingFAQ">
                      <div className="accordion-body">
                        Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                        Is there a free trial?
                      </button>
                    </h2>
                    <div id="faq2" className="accordion-collapse collapse" data-bs-parent="#pricingFAQ">
                      <div className="accordion-body">
                        Yes, we offer a 14-day free trial with full access to all Professional features.
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">
                        What payment methods do you accept?
                      </button>
                    </h2>
                    <div id="faq3" className="accordion-collapse collapse" data-bs-parent="#pricingFAQ">
                      <div className="accordion-body">
                        We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}