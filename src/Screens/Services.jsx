// src/Screens/Services.jsx

import React from 'react';
import { NavLink, Link } from 'react-router-dom';


const BookOpen = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    <path d="M20 17H4" />
    <path d="M7 12V3h5l4 4v5" />
  </svg>
);


const Stethoscope = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 18l-4 4-2-2 4-4" />
    <path d="M15 22V8.5l-2-2-2 2V22" />
    <path d="M18 10a6 6 0 0 0-12 0" />
    <path d="M12 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
  </svg>
);


const Sparkles = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8l-1.45-2.61L14 4l2.55-1.39L18 0l1.45 2.61L22 4l-2.55 1.39L18 8z" />
    <path d="M12 18l-1.45-2.61L8 14l2.55-1.39L12 10l1.45 2.61L16 14l-2.55 1.39L12 18z" />
    <path d="M6 14l-1.45-2.61L2 10l2.55-1.39L6 6l1.45 2.61L10 10l-2.55 1.39L6 14z" />
  </svg>
);


const Wrench = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-3.76 3.76a2 2 0 0 1-2.83 0L3 19a2 2 0 0 1 0-2.83l3.76-3.76a6 6 0 0 1 7.94-7.94l-3.76 3.76a2 2 0 0 1-2.83 0L3 19a2 2 0 0 1 0-2.83l3.76-3.76a6 6 0 0 1 7.94-7.94z" />
    <path d="M21.2 15c.1-.5.2-1.1.2-1.7 0-3.4-2.4-6.3-5.5-7.1l-1.2 1.2a4 4 0 0 0 4.3 4.3l1.2-1.2z" />
  </svg>
);


const AlarmClock = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="10"></circle>
        <path d="M12 17V13"></path>
        <path d="M12 10h.01"></path>
        <path d="M4 17l-1 1"></path>
        <path d="M21 18l-1-1"></path>
    </svg>
);


// --- External Logo Component (From previous files) ---

const ExternalLogo = ({ size = 'w-6 h-6', className = '' }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
    alt="Dental Clinic Logo" 
    className={`${size} ${className}`} 
    // backupimage
    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/24x24/f5f5f5/a0aec0?text=Logo" }}
  />
);


// service card list

const services = [
  {
    icon: Stethoscope,
    title: "Preventative Care & Hygiene",
    description: "Routine check-ups, cleanings, X-rays, and fluoride treatments to maintain long-term oral health and catch issues early.",
    color: "text-green-500",
  },
  {
    icon: Sparkles,
    title: "Cosmetic Dentistry",
    description: "Achieve the smile of your dreams with services like professional teeth whitening, veneers, and smile makeovers.",
    color: "text-pink-500",
  },
  {
    icon: Wrench,
    title: "Restorative Dentistry",
    description: "Repair and restore damaged teeth using modern fillings, crowns, bridges, and dental implant solutions.",
    color: "text-blue-500",
  },
  {
    icon: AlarmClock,
    title: "Emergency Dental Services",
    description: "We provide prompt care for toothaches, broken teeth, knocked-out teeth, and other unexpected dental injuries.",
    color: "text-red-500",
  },
  {
    icon: Wrench,
    title: "Root Canal Therapy",
    description: "Expert treatment to save a damaged or infected tooth, alleviating pain and preserving your natural smile.",
    color: "text-indigo-500",
  },
  {
    icon: Stethoscope,
    title: "Children's Dentistry",
    description: "Gentle and friendly dental care for children, focusing on education and healthy habits from a young age.",
    color: "text-yellow-500",
  },
  {
    icon: Sparkles,
    title: "Orthodontics & Aligners",
    description: "Straighten your smile discreetly using clear aligners or traditional braces, customized for your needs.",
    color: "text-purple-500",
  },
  {
    icon: Wrench,
    title: "Gum Disease Treatment",
    description: "Comprehensive periodontal care, including deep cleanings and advanced therapies to combat gum disease and maintain bone health.",
    color: "text-cyan-500",
  },
];


const Services = () => {
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
            <NavLink to="/services" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold transition duration-150' : 'text-gray-600 hover:text-indigo-600 transition duration-150'}>Services</NavLink> {/* Active link */}
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
        
    
        <section className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4">
            Our Full Range of <span className="text-indigo-600">Dental Services</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Providing comprehensive care from routine cleanings to advanced cosmetic and restorative procedures.
          </p>
        </section>

       
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col items-start space-y-3"
            >
              <div className={`p-3 rounded-xl bg-indigo-500/10 ${service.color}`}>
                <service.icon className="w-8 h-8"/>
              </div>
              <h3 className="text-xl font-bold text-gray-800">{service.title}</h3>
              <p className="text-gray-600 flex-grow">{service.description}</p>
              {/* 4. Converted <a> to Link */}
              <Link to="/services" className="text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition duration-150 mt-4">
                Learn More &rarr;
              </Link>
            </div>
          ))}
        </section>

        
        <section className="mt-20 bg-indigo-600 text-white p-10 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-6 md:space-y-0">
            <div className="md:max-w-xl">
                <h2 className="text-3xl font-bold mb-2">Ready for a Healthier Smile?</h2>
                <p className="text-indigo-100">Contact us today to schedule your first appointment and discover personalized care.</p>
            </div>
             {/* 5. Converted button to Link */}
            <Link to="/book" className="flex items-center px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-gray-100 transition duration-200 text-lg whitespace-nowrap">
                <BookOpen className="w-5 h-5 mr-2" />
                Book Your Visit
            </Link>
        </section>
        

        <section className="bg-gray-100 p-10 rounded-3xl shadow-inner grid md:grid-cols-4 gap-8 items-center mt-20">
           
            <div className="flex flex-col items-center justify-center p-4">
                
                <ExternalLogo size="w-12 h-12" className="mb-4" /> 
                <span className="font-semibold text-lg text-gray-800">Menchie's Dental Clinic</span>
            </div>
            
           
            <div className="text-center md:text-left space-y-2">
                <h4 className="font-bold text-lg text-gray-800 mb-2">Contact Us</h4>
                <p className="text-gray-600">Phone: (123) 456-7890</p>
                <p className="text-gray-600">Email: info@menchiedental.com</p>
                <p className="text-gray-600">Emergencies: Call us 24/7</p>
            </div>

            
            <div className="text-center md:text-left space-y-2">
                <h4 className="font-bold text-lg text-gray-800 mb-2">Connect Online</h4>
                {/* <a> tags are fine here if they link to external social media sites */}
                <a href="#" className="block text-indigo-600 hover:underline">Facebook</a>
                <a href="#" className="block text-indigo-600 hover:underline">Instagram</a>
                <a href="#" className="block text-indigo-600 hover:underline">Twitter</a>
            </div>

           
            <div className="text-center md:text-left space-y-2">
                <h4 className="font-bold text-lg text-gray-800 mb-2">Our Location</h4>
                <p className="text-gray-600">samwer in baguio</p>
                <p className="text-gray-600">baguio</p>
                <p className="text-gray-600">pelpens</p>
            </div>
        </section>

      </main>

     
      <footer className="w-full py-4 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Services;