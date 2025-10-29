import React from 'react';
import './AboutPage.css';

const AboutPage = () => {
  const team = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Chief Medical Officer',
      specialty: 'Internal Medicine',
      image: '👩‍⚕️'
    },
    {
      name: 'Dr. Michael Chen',
      role: 'Head of Surgery',
      specialty: 'General Surgery',
      image: '👨‍⚕️'
    },
    {
      name: 'Dr. Emily Rodriguez',
      role: 'Pediatric Specialist',
      specialty: 'Pediatrics',
      image: '👩‍⚕️'
    },
    {
      name: 'Dr. James Wilson',
      role: 'Emergency Medicine',
      specialty: 'Emergency Care',
      image: '👨‍⚕️'
    }
  ];

  const milestones = [
    { year: '2008', event: 'MediBridge Clinic Founded' },
    { year: '2012', event: 'Expanded to 3 Locations' },
    { year: '2016', event: 'Introduced Digital Health Records' },
    { year: '2020', event: 'Launched Telemedicine Services' },
    { year: '2023', event: 'Implemented AR Technology' }
  ];

  return (
    <div className="about-page">
      {/* Header Section */}
      <section className="about-header">
        <div className="header-content">
          <h1>About MediBridge</h1>
          <p>Bridging the gap between traditional healthcare and modern technology to provide exceptional patient care.</p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="mission-grid">
          <div className="mission-card">
            <h3>🎯 Our Mission</h3>
            <p>To provide accessible, high-quality healthcare services while leveraging innovative technology to enhance patient experience and outcomes.</p>
          </div>
          <div className="mission-card">
            <h3>👁️ Our Vision</h3>
            <p>To be the leading healthcare provider that seamlessly integrates cutting-edge technology with compassionate care.</p>
          </div>
          <div className="mission-card">
            <h3>💎 Our Values</h3>
            <p>Compassion, Innovation, Excellence, Integrity, and Patient-Centered Care guide everything we do.</p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="story-content">
          <h2>Our Story</h2>
          <p>
            Founded in 2008, MediBridge began as a small independent clinic with a big vision: to revolutionize healthcare delivery through technology and compassionate care. What started as a single location serving the local community has grown into a comprehensive healthcare network.
          </p>
          <p>
            Our journey has been marked by continuous innovation. We were among the first clinics to implement electronic health records, introduce telemedicine services, and now we're pioneering the use of Augmented Reality (AR) to help patients better understand their medical procedures and treatments.
          </p>
          <p>
            Today, we serve over 10,000 patients annually, but we never forget our roots as a community-focused clinic that puts patients first.
          </p>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="timeline-section">
        <h2>Our Journey</h2>
        <div className="timeline">
          {milestones.map((milestone, index) => (
            <div key={index} className="timeline-item">
              <div className="timeline-year">{milestone.year}</div>
              <div className="timeline-event">{milestone.event}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <h2>Meet Our Team</h2>
        <div className="team-grid">
          {team.map((member, index) => (
            <div key={index} className="team-card">
              <div className="team-image">{member.image}</div>
              <h3>{member.name}</h3>
              <p className="team-role">{member.role}</p>
              <p className="team-specialty">{member.specialty}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Section */}
      <section className="technology-section">
        <h2>Our Technology</h2>
        <div className="tech-grid">
          <div className="tech-card">
            <div className="tech-icon">🥽</div>
            <h3>AR Visualization</h3>
            <p>Experience your medical procedures through immersive AR technology, reducing anxiety and improving understanding.</p>
          </div>
          <div className="tech-card">
            <div className="tech-icon">📊</div>
            <h3>Data Analytics</h3>
            <p>Advanced analytics provide personalized insights and help optimize treatment plans for better outcomes.</p>
          </div>
          <div className="tech-card">
            <div className="tech-icon">📱</div>
            <h3>Digital Platform</h3>
            <p>Seamless digital experience from appointment booking to follow-up care, all in one integrated platform.</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <h2>Visit Us</h2>
        <div className="contact-info">
          <div className="contact-card">
            <h3>📍 Main Location</h3>
            <p>123 Healthcare Avenue<br />Medical District, MD 12345</p>
          </div>
          <div className="contact-card">
            <h3>📞 Contact</h3>
            <p>Phone: (555) 123-4567<br />Email: info@medibridge.com</p>
          </div>
          <div className="contact-card">
            <h3>🕒 Hours</h3>
            <p>Mon-Fri: 8:00 AM - 8:00 PM<br />Sat-Sun: 9:00 AM - 5:00 PM</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
