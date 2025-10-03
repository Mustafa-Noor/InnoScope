'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Features from '../components/Features';
import Footer from '../components/Footer';

export default function FeaturesPage() {
  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <main>
      <Navbar />
      <div style={{ paddingTop: '80px' }}>
        {/* Hero Section for Features */}
        <section className="bg-light py-5">
          <div className="container text-center">
            <h1 className="display-4 fw-bold mb-4">Powerful Features</h1>
            <p className="lead text-muted">
              Discover all the tools and capabilities that make InnoScope the perfect solution for your business
            </p>
          </div>
        </section>
        
        <Features />
        
        {/* Additional Features Details */}
        <section className="section-padding">
          <div className="container">
            <div className="row g-5 align-items-center">
              <div className="col-lg-6">
                <h2 className="fw-bold mb-4">Advanced Analytics Dashboard</h2>
                <p className="text-muted mb-4">
                  Get deep insights into your business performance with our comprehensive analytics dashboard. 
                  Track key metrics, identify trends, and make data-driven decisions.
                </p>
                <ul className="list-unstyled">
                  <li className="mb-2">✓ Real-time data visualization</li>
                  <li className="mb-2">✓ Customizable charts and graphs</li>
                  <li className="mb-2">✓ Export reports in multiple formats</li>
                  <li className="mb-2">✓ Automated alerts and notifications</li>
                </ul>
              </div>
              <div className="col-lg-6">
                <div className="bg-light rounded p-5 text-center">
                  <div className="display-1 mb-3">📊</div>
                  <h4>Interactive Dashboard Preview</h4>
                  <p className="text-muted">Beautiful visualizations at your fingertips</p>
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