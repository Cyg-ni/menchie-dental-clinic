import React from 'react';

const ImagePlaceholderIcon = () => (
    <svg viewBox="0 0 100 80" className="image-placeholder-svg">
        <path d="M7.5 70 l 25-30 l 15 10 l 20-25 l 25 35 Z" fill="#E0E0E0" strokeWidth="1"/>
        <circle cx="80" cy="25" r="8" fill="#E0E0E0" />
    </svg>
);

function HomePage() {
  return (
    <section className="hero-section">
      <div className="container hero-container">
        <div className="hero-text">
          <h2>Modern Dentistry for a Perfect Smile</h2>
          <p className="subtitle">
            Lorem ipsum dolor sit amet<br />
            Lorem ipsum dolor sit
          </p>
          <p className="description-text">
            Our clinic uses the latest technology to provide top-quality dental care. From routine check-ups to advanced cosmetic procedures, we are dedicated to helping you achieve and maintain a healthy, beautiful smile in a comfortable environment.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary">Working Hours</button>
            <button className="btn btn-secondary">Contact Us</button>
          </div>
        </div>
        <div className="hero-image-slider">
          <div className="image-placeholder">
             <ImagePlaceholderIcon />
          </div>
          <div className="slider-dots">
            <span className="dot"></span>
            <span className="dot active"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomePage;