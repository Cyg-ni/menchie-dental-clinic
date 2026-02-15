// src/App.jsx

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import all screens from your Screens folder
import Home from './Screens/Home';
import AboutUs from './Screens/About_us';
import Services from './Screens/Services';
import Appointment from './Screens/Appointment';
import Auth from './Screens/Auth'; 
import PatientPortal from './Screens/PatientPortal';
import TrackStatus from './Screens/TrackStatus';


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Map each path to its component */}
        
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/book" element={<Appointment />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/my-records" element={<PatientPortal patientId="test-patient-id" />} />
        <Route path="/track/:id" element={<TrackStatus />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;