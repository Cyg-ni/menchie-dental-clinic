import React, { useState } from 'react';
import HomePage from './HomePage';
import AboutPage from './AboutPage';
import QRScanner from './QRScanner';
import BookAppointment from './BookAppointment';
import './UserDashboard.css';

const UserDashboard = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'about':
        return <AboutPage />;
      case 'qr-scanner':
        return <QRScanner />;
      case 'book-appointment':
        return <BookAppointment user={user} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="user-dashboard">
      <nav className="navbar">
        <div className="navbar-brand">MediBridge</div>
        <ul className="navbar-nav">
          <li>
            <button
              className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentPage('home')}
            >
              Home
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}
              onClick={() => setCurrentPage('about')}
            >
              About Us
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${currentPage === 'qr-scanner' ? 'active' : ''}`}
              onClick={() => setCurrentPage('qr-scanner')}
            >
              QR Scanner
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${currentPage === 'book-appointment' ? 'active' : ''}`}
              onClick={() => setCurrentPage('book-appointment')}
            >
              Book Appointment
            </button>
          </li>
          <li>
            <span className="user-info">Welcome, {user.name}</span>
          </li>
          <li>
            <button className="btn btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </li>
        </ul>
      </nav>
      
      <main className="dashboard-content">
        {renderPage()}
      </main>
    </div>
  );
};

export default UserDashboard;
