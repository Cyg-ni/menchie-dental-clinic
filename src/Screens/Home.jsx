// src/Screens/Home.jsx

import React from 'react'; 
// Ensure you have run: npm install react-router-dom
import { Link } from 'react-router-dom'; 


// --- Icon Components ---

const BookOpen = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    <path d="M20 17H4" />
    <path d="M7 12V3h5l4 4v5" />
  </svg>
);

const Clock = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const Phone = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-5.6-5.6A19.79 19.79 0 0 1 2 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72v4c0 .66-.31 1.28-.84 1.75l-1.31 1.31a15.35 15.35 0 0 0 5.6 5.6l1.31-1.31c.47-.53 1.09-.84 1.75-.84h4a2 2 0 0 1 2 2z" />
  </svg>
);


// --- Main Component ---
const Home = () => {
  
  return (
    <div className="min-h-screen bg-gray-50 font-inter">

      <section className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
              alt="Dental Clinic Logo" 
              className="w-6 h-6" 
            /> 
            <span>Menchie's Dental Clinic</span>
          </div>

          <nav className="hidden md:flex space-x-8 text-lg">
            {/* 💡 FIXED: Navigation links use <Link to="..."> */}
            <Link to="/" className="text-indigo-600 font-bold transition duration-150">Home</Link>
            <Link to="/about" className="text-gray-600 hover:text-indigo-600 transition duration-150">About Us</Link>
            <Link to="/services" className="text-gray-600 hover:text-indigo-600 transition duration-150">Services</Link>
          </nav>

          <div className="hidden sm:block">
            {/* 💡 FIXED: Button uses <Link to="/book"> */}
            <Link to="/book" className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl shadow-lg hover:bg-indigo-700 transition duration-200 text-lg">
              <BookOpen className="w-5 h-5 mr-2" />
              Book Appointment
            </Link>
          </div>
        </div>
      </section>

      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center min-h-[90vh]">
        
        <section id="homehero" className="space-y-6">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-tight">
            Modern Dentistry for a <span className="text-indigo-600">Perfect Smile</span>
          </h1>
          
          <h3 className="text-2xl font-light text-gray-600">
            Providing comprehensive, personalized dental care to meet your unique needs.
          </h3>
          
          <div className="pt-4 space-y-4 text-gray-700 text-lg leading-relaxed">
            <p>
              Welcome to Menchie's Dental Clinic, where your comfort and oral health are our top priorities. We blend cutting-edge technology with compassionate care to deliver exceptional results in a relaxing, modern environment. From routine checkups to advanced cosmetic procedures, we are here to ensure your smile is healthy and bright.
            </p>
          </div>

          <div className="flex space-x-4 pt-6">
            <button className="flex items-center px-6 py-3 bg-gray-800 text-white font-medium rounded-xl shadow-xl hover:bg-gray-900 transition duration-200 text-lg">
              <Clock className="w-5 h-5 mr-2" />
              Working Hours
            </button>
            <button className="flex items-center px-6 py-3 bg-white text-gray-800 border-2 border-gray-300 font-medium rounded-xl hover:bg-gray-100 transition duration-200 text-lg">
              <Phone className="w-5 h-5 mr-2" />
              Contact Us
            </button>
          </div>
        </section>


        <section id="imagecarousel" className="flex flex-col items-center">
          <div className="w-full aspect-[4/3] bg-white border-4 border-gray-200 rounded-3xl shadow-2xl flex items-center justify-center text-gray-400 text-3xl overflow-hidden">
            
            <div className="p-8 text-center">
              <span className="text-indigo-400 font-bold">High-Quality Image Space</span>
              <p className="text-sm mt-2">Replace this box with an actual dental image or graphic.</p>
            </div>
          </div>
          
          <div id="dots" className="flex justify-center space-x-3 mt-6">
            <span className="w-3 h-3 bg-gray-300 rounded-full cursor-pointer hover:bg-gray-400 transition"></span>
            <span className="w-3 h-3 bg-indigo-600 rounded-full cursor-pointer"></span> {/* Active dot */}
            <span className="w-3 h-3 bg-gray-300 rounded-full cursor-pointer hover:bg-gray-400 transition"></span>
            <span className="w-3 h-3 bg-gray-300 rounded-full cursor-pointer hover:bg-gray-400 transition"></span>
          </div>
        </section>
        
      </main>

      
      <footer className="w-full py-4 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Home;