const MapPlaceholder = () => (
  <svg viewBox="0 0 150 100" className="map-svg">
    <path d="M0 0 H150 V100 H0 Z" fill="#f0f1f3" />
    <path d="M20 100 L50 0 M60 100 L90 0 M0 30 H150 M0 70 H150" stroke="#fff" strokeWidth="2" />
    <path d="M75 35 a10 10 0 1 1 0 20 a10 10 0 1 1 0-20 m0 5 v-15" fill="var(--primary-color)" stroke="white" strokeWidth="2" />
  </svg>
);

function AboutPage() {
  return (
    <>
      <section className="about-section">
        <div className="container about-container">
          <div className="about-text">
            <h2>About Menchie's Dental Clinic</h2>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet.</p>
            <p>Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla.</p>
          </div>
          <div className="about-map">
            <MapPlaceholder />
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container features-container">
          <div className="feature-item">
            <div className="icon-wrapper"></div>
            <h3>Stress-Free</h3>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero.</p>
          </div>
          <div className="feature-item">
            <div className="icon-wrapper"></div>
            <h3>Affordable</h3>
            <p>Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.</p>
          </div>
          <div className="feature-item">
            <div className="icon-wrapper"></div>
            <h3>Personalized</h3>
            <p>Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export default AboutPage;