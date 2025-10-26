import React, { useState } from 'react';
import './App.css';

import Header from './components/clients/Header';
import HomePage from './components/clients/HomePage';
import AboutPage from './components/clients/AboutPage';
import ServicesPage from './components/clients/ServicesPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'about':
        return <AboutPage />;
      case 'services':
        return <ServicesPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="page-wrapper">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;