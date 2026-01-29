import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom'; 
import { auth } from '../firebase-config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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

const Mail = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const MapPin = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false); 
  const [currentIndex, setCurrentIndex] = useState(0);

  const carouselImages = [
    "https://images.pexels.com/photos/3779705/pexels-photo-3779705.jpeg?cs=srgb&dl=pexels-olly-3779705.jpg&fm=jpg", 
    "https://mysierradental.com/wp-content/uploads/2024/09/first-dentist-visit-guide.jpg",
    "https://img.freepik.com/free-photo/photo-smiling-dentist-standing-with-arms-crossed-with-her-colleague-showing-okay-sign_496169-1043.jpg?semt=ais_hybrid&w=740&q=80",
    "https://st2.depositphotos.com/1518767/6527/i/450/depositphotos_65279377-stock-photo-smiling-co-workers-in-a.jpg",
  ];

  // Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      signOut(auth).catch((error) => console.error("Logout error:", error));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-900">
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <img src="https://cdn-icons-png.flaticon.com/512/103/103386.png" alt="Logo" className="w-6 h-6" /> 
            <span>Menchie's Dental Clinic</span>
          </div>
          
          <div className="hidden md:flex space-x-8 text-lg font-medium">
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>Home</NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>About Us</NavLink> 
            <NavLink to="/services" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>Services</NavLink>
            <Link to="/my-records" className="text-indigo-600 font-semibold transition">My Records</Link> 
          </div>

          <div className="flex items-center space-x-4">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-3">
                    <Link to="/book" className="flex items-center px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-200 text-base">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Book Appointment
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="flex items-center px-5 py-2.5 border-2 border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition duration-200 text-base"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link to="/auth" className="flex items-center px-8 py-2.5 border-2 border-indigo-600 text-indigo-600 font-extrabold rounded-xl hover:bg-indigo-50 transition duration-200 text-base">
                    Sign In
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center min-h-[90vh]">
        <section className="space-y-6">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-tight">
            Modern Dentistry for a <span className="text-indigo-600">Perfect Smile</span>
          </h1>
          <p className="text-2xl font-light text-gray-600">
            Providing comprehensive, personalized dental care to meet your unique needs.
          </p>
          
          <div className="flex space-x-4 pt-6">
            <button 
              onClick={() => setIsHoursOpen(true)}
              className="flex items-center px-6 py-3 bg-gray-800 text-white font-medium rounded-xl shadow-xl hover:bg-gray-900 transition text-lg"
            >
              <Clock className="w-5 h-5 mr-2" /> Working Hours
            </button>
            <button 
              onClick={() => setIsContactOpen(true)} 
              className="flex items-center px-6 py-3 bg-white text-gray-800 border-2 border-gray-300 font-medium rounded-xl hover:bg-gray-100 transition text-lg"
            >
              <Phone className="w-5 h-5 mr-2" /> Contact Us
            </button>
          </div>
        </section>

        {/* Carousel */}
        <section className="flex flex-col items-center">
          <div className="w-full aspect-[4/3] bg-white border-4 border-gray-200 rounded-3xl shadow-2xl overflow-hidden relative">
            {carouselImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Slide ${index}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentIndex ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>
          <div className="flex justify-center space-x-3 mt-6">
            {carouselImages.map((_, index) => (
              <button key={index} onClick={() => setCurrentIndex(index)} className={`w-3 h-3 rounded-full transition-all ${currentIndex === index ? "bg-indigo-600 w-8" : "bg-gray-300"}`} />
            ))}
          </div>
        </section>
      </main>

      {/* --- MODALS --- */}

      {/* Working Hours Modal */}
      {isHoursOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsHoursOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative animate-in zoom-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-indigo-600" /> Opening Hours
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2"><span>Mon - Fri</span> <span className="font-bold">8AM - 5PM</span></div>
              <div className="flex justify-between border-b pb-2"><span>Saturday</span> <span className="font-bold">8AM - 6PM</span></div>
              <div className="flex justify-between pb-2 text-red-500 font-bold"><span>Sunday</span> <span>Closed</span></div>
            </div>
            <button onClick={() => setIsHoursOpen(false)} className="w-full mt-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">Close</button>
          </div>
        </div>
      )}

      {/* Contact Us Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsContactOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative animate-in zoom-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsContactOpen(false)} className="absolute top-4 right-4 text-gray-400 text-xl">✕</button>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Phone className="w-6 h-6 mr-2 text-indigo-600" /> Get in Touch
            </h2>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Phone className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Call/Text</p>
                  <a href="tel:+1234567890" className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition">(123) 456-7890</a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Mail className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Email</p>
                  <a href="mailto:hello@menchiesdental.com" className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition">info@menchiedental.com</a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><MapPin className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Location</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">baguio<br/>shopper's lane</p>
                </div>
              </div>
            </div>

            <a href="https://www.facebook.com/menchieamor.a.dangla" target="_blank" rel="noopener noreferrer">
            <button className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center hover:bg-indigo-700 transition">
              Message Us Directly
            </button>
          </a>
          </div>
        </div>
      )}

      <footer className="w-full py-4 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic.
      </footer>
    </div>
  );
};

export default Home;