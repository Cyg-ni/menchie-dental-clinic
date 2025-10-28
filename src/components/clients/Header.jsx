import React from 'react';

const ImagePlaceholderIcon = () => (
    <svg viewBox="0 0 100 80" className="image-placeholder-svg">
        <path d="M7.5 70 l 25-30 l 15 10 l 20-25 l 25 35 Z" fill="#E0E0E0" strokeWidth="1"/>
        <circle cx="80" cy="25" r="8" fill="#E0E0E0" />
    </svg>
);

function Header({ currentPage, setCurrentPage }) {

  const handleNavClick = (e, page) => {
    e.preventDefault();
    setCurrentPage(page);
  };

  return (
    <header className="site-header">
      <div className="container header-container">
        <a href="#home" className="logo" onClick={(e) => handleNavClick(e, 'home')}>
          <div className="logo-icon">
            <ImagePlaceholderIcon />
          </div>
          <h1>Menchie's Dental Clinic</h1>
        </a>
        <nav className="main-nav">
          <ul>
            <li>
              <a 
                href="#home" 
                className={currentPage === 'home' ? 'active' : ''} 
                onClick={(e) => handleNavClick(e, 'home')}
              >
                Home
              </a>
            </li>
            <li>
              <a 
                href="#about" 
                className={currentPage === 'about' ? 'active' : ''} 
                onClick={(e) => handleNavClick(e, 'about')}
              >
                About Us
              </a>
            </li>
            <li>
              <a 
                href="#services" 
                className={currentPage === 'services' ? 'active' : ''} 
                onClick={(e) => handleNavClick(e, 'services')}
              >
                Services
              </a>
            </li>
          </ul>
        </nav>
        <button className="btn btn-outline">Book Appointment</button>
      </div>
    </header>
  );
}

export default Header;