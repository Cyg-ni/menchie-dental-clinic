// src/Screens/About_us.jsx

import React from 'react';
import { NavLink, Link } from 'react-router-dom';


// --- Icon Components ---

const BookOpen = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    <path d="M20 17H4" />
    <path d="M7 12V3h5l4 4v5" />
  </svg>
);


const SmileIcon = (props) => ( 
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <line x1="9" y1="9" x2="9.01" y2="9"></line>
        <line x1="15" y1="9" x2="15.01" y2="9"></line>
    </svg>
);

const WalletIcon = (props) => ( 
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3m-4 0v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-5Z"></path>
    </svg>
);

const HeartIcon = (props) => ( 
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
    </svg>
);


// --- Main Component ---
const AboutUs = () => {
  const ExternalLogo = ({ size = 'w-6 h-6', className = '' }) => (
    <img 
      src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
      alt="Dental Clinic Logo" 
      className={`${size} ${className}`} 
      onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/24x24/f5f5f5/a0aec0?text=Logo" }}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50 font-inter">

      <section className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo size="w-6 h-6" />
            <span>Menchie's Dental Clinic</span>
          </div>
          <nav className="hidden md:flex space-x-8 text-lg">
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold transition duration-150' : 'text-gray-600 hover:text-indigo-600 transition duration-150'}>Home</NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold transition duration-150' : 'text-gray-600 hover:text-indigo-600 transition duration-150'}>About Us</NavLink> 
            <NavLink to="/services" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold transition duration-150' : 'text-gray-600 hover:text-indigo-600 transition duration-150'}>Services</NavLink>
          </nav>
          <div className="hidden sm:block">
            <Link to="/book" className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl shadow-lg hover:bg-indigo-700 transition duration-200 text-lg">
              <BookOpen className="w-5 h-5 mr-2" />
              Book Appointment
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        <section className="grid md:grid-cols-2 gap-12 items-start mb-20">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              About <span className="text-indigo-600">Menchie's Dental Clinic</span>
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              At Menchie's Dental Clinic, we are committed to providing exceptional dental care that prioritizes your health, comfort, and peace of mind. Our mission is to foster lasting relationships with our patients by delivering personalized treatments in a welcoming and state-of-the-art environment.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Founded on principles of integrity and excellence, our clinic continually invests in the latest dental technologies and ongoing education for our team. This ensures that you receive the most effective and advanced treatments available, from routine checkups to complex restorative and cosmetic procedures. We believe everyone deserves a healthy, radiant smile.
            </p>
            
            {/* Specific Address Badge */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-xl">
               <p className="text-indigo-900 font-bold uppercase text-xs tracking-wider mb-1">Visit us at:</p>
               <p className="text-indigo-800 font-medium">
                  Unit 17-A Ground Floor Shopper's Lane Building<br/>
                  Lower General Luna Road, Baguio City
               </p>
            </div>
          </div>
             {/* Functional Map with Shopper's Lane Pin */}
          <div className="bg-white rounded-3xl h-[450px] overflow-hidden shadow-2xl relative border-4 border-white">
            <iframe
              title="Google Maps Shopper's Lane Location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              // The "q" parameter creates the pin at the specific address
              src="https://www.google.com/maps?q=Shopper's+Lane+Building,+Lower+General+Luna+Road,+Baguio+City&output=embed"
            ></iframe>
          </div>
                   
        </section>

        <section className="text-center mb-20">
          <h2 className="text-4xl font-bold text-gray-900 mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-lg flex flex-col items-center">
              <SmileIcon className="w-12 h-12 text-indigo-500 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Stress-Free Environment</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                We understand dental visits can be daunting. Our clinic is designed to be a calming oasis, with comfortable amenities and a gentle approach to make every appointment as relaxing as possible.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-lg flex flex-col items-center">
              <WalletIcon className="w-12 h-12 text-indigo-500 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Accessible & Affordable</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Quality dental care shouldn't break the bank. We offer transparent pricing, flexible payment options, and help with insurance claims to ensure our services are accessible to everyone.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-lg flex flex-col items-center">
              <HeartIcon className="w-12 h-12 text-indigo-500 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Personalized Care</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Every smile is unique, and so is our approach. We take the time to understand your individual needs and goals, crafting bespoke treatment plans for the best possible outcomes.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gray-100 p-10 rounded-3xl shadow-inner grid md:grid-cols-4 gap-8 items-center mt-20">
            <div className="flex flex-col items-center justify-center p-4">
                <ExternalLogo size="w-12 h-12" className="mb-4" /> 
                <span className="font-semibold text-lg text-gray-800 text-center">Menchie's Dental Clinic</span>
            </div>
            
            <div className="text-center md:text-left space-y-2">
                <h4 className="font-bold text-lg text-gray-800 mb-2">Contact Us</h4>
                <p className="text-gray-600">Phone: (123) 456-7890</p>
                <p className="text-gray-600">Email: info@menchiedental.com</p>
                <p className="text-gray-600">Emergencies: Call us 24/7</p>
            </div>

            <div className="text-center md:text-left space-y-2">
                <h4 className="font-bold text-lg text-gray-800 mb-2">Connect Online</h4>
                <a href="#" className="block text-indigo-600 hover:underline">Facebook</a>
                <a href="#" className="block text-indigo-600 hover:underline">Instagram</a>
            </div>

            <div className="text-center md:text-left space-y-2">
                <h4 className="font-bold text-lg text-gray-800 mb-2">Our Location</h4>
                <p className="text-gray-600 font-medium text-sm">Unit 17-A Shopper's Lane Building</p>
                <p className="text-gray-600 text-sm">Lower General Luna Road</p>
                <p className="text-gray-600 text-sm">Baguio City, Philippines</p>
            </div>
        </section>

      </main>

      <footer className="w-full py-4 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        © {new Date().getFullYear()} Menchie's Dental Clinic. All Rights Reserved.
      </footer>
    </div>
  );
};

export default AboutUs;