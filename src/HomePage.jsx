import React from 'react';
import './HomePage.css';

const HomePage = () => {
  const services = [
    {
      icon: '🏥',
      title: 'General Consultation',
      description: 'Comprehensive health checkups and consultations'
    },
    {
      icon: '🔬',
      title: 'Laboratory Services',
      description: 'Advanced diagnostic testing and analysis'
    },
    {
      icon: '💊',
      title: 'Pharmacy',
      description: 'Complete medication and prescription services'
    },
    {
      icon: '🚑',
      title: 'Emergency Care',
      description: '24/7 emergency medical services'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Patients Served' },
    { number: '50+', label: 'Medical Professionals' },
    { number: '15+', label: 'Years of Service' },
    { number: '24/7', label: 'Emergency Support' }
  ];

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Welcome to MediBridge Clinic</h1>
          <p>Your trusted healthcare partner providing comprehensive medical services with cutting-edge technology and compassionate care.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary">Book Appointment</button>
            <button className="btn btn-secondary">Learn More</button>
          </div>
        </div>
        <div className="hero-image">
          <div className="medical-icon">🏥</div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <h3>{stat.number}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <h2>Our Services</h2>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Why Choose MediBridge?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>🔍 AR Visualization</h3>
            <p>Experience your medical procedures through advanced AR technology for better understanding and reduced anxiety.</p>
          </div>
          <div className="feature-card">
            <h3>📊 Data Analytics</h3>
            <p>Personalized health insights and treatment recommendations based on comprehensive data analysis.</p>
          </div>
          <div className="feature-card">
            <h3>⏰ Time Efficiency</h3>
            <p>Streamlined processes to minimize waiting times and maximize your valuable time.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Experience Better Healthcare?</h2>
          <p>Join thousands of satisfied patients who trust MediBridge for their healthcare needs.</p>
          <button className="btn btn-primary">Get Started Today</button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
