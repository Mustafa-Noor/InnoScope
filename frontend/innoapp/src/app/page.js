'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Testimonials from './components/Testimonials';
import CTA from './components/CTA';
import Footer from './components/Footer';

export default function Home() {
  useEffect(() => {
    // Import Bootstrap JS only on client side
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  )
}
