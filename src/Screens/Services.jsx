// src/Screens/Services.jsx

import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { auth, storage, db } from '../firebase-config';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';


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

const Clock = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CameraIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
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
    price: "₱800 - ₱1,500",
    color: "text-green-500",
  },
  {
    icon: Sparkles,
    title: "Cosmetic Dentistry",
    description: "Achieve the smile of your dreams with services like professional teeth whitening, veneers, and smile makeovers.",
    price: "₱3,500 - ₱18,000",
    color: "text-pink-500",
  },
  {
    icon: Wrench,
    title: "Restorative Dentistry",
    description: "Repair and restore damaged teeth using modern fillings, crowns, bridges, and dental implant solutions.",
    price: "₱1,200 - ₱12,000",
    color: "text-blue-500",
  },
  {
    icon: AlarmClock,
    title: "Emergency Dental Services",
    description: "We provide prompt care for toothaches, broken teeth, knocked-out teeth, and other unexpected dental injuries.",
    price: "₱1,000 - ₱5,000",
    color: "text-red-500",
  },
  {
    icon: Wrench,
    title: "Root Canal Therapy",
    description: "Expert treatment to save a damaged or infected tooth, alleviating pain and preserving your natural smile.",
    price: "₱3,500 - ₱9,000",
    color: "text-indigo-500",
  },
  {
    icon: Stethoscope,
    title: "Children's Dentistry",
    description: "Gentle and friendly dental care for children, focusing on education and healthy habits from a young age.",
    price: "₱600 - ₱1,800",
    color: "text-yellow-500",
  },
  {
    icon: Sparkles,
    title: "Orthodontics & Aligners",
    description: "Straighten your smile discreetly using clear aligners or traditional braces, customized for your needs.",
    price: "₱20,000 - ₱70,000",
    color: "text-purple-500",
  },
  {
    icon: Wrench,
    title: "Gum Disease Treatment",
    description: "Comprehensive periodontal care, including deep cleanings and advanced therapies to combat gum disease and maintain bone health.",
    price: "₱1,500 - ₱8,000",
    color: "text-cyan-500",
  },
];


const Services = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'patients', currentUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            setProfile(profileData);
            // Also set photoURL on user state for sidebar display
            if (profileData?.photoURL) {
              setUser({ ...currentUser, photoURL: profileData.photoURL });
            } else {
              setUser(currentUser);
            }
          } else {
            setProfile(null);
            setUser(currentUser);
          }
        } catch (error) {
          console.error('Error fetching patient profile:', error);
          setProfile(null);
          setUser(currentUser);
        }
      } else {
        setProfile(null);
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      signOut(auth).then(() => setIsSidebarOpen(false)).catch((error) => console.error("Logout error:", error));
    }
  };

  const handlePhotoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    try {
      setIsUploading(true);
      const reader = new FileReader();
      const photoURL = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result;
          console.log('Image converted to base64, size:', base64String.length);
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Store in Firestore instead of Auth (Auth has size limits)
      await setDoc(doc(db, 'patients', user.uid), { photoURL }, { merge: true });
      setUser({ ...user, photoURL });
      alert("Profile photo updated!");
    } catch (error) {
      console.error("Error updating photo:", error);
      alert("Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter overflow-x-hidden animate-fade-in">

      <div className={`fixed inset-y-0 right-0 z-100 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <button onClick={() => setIsSidebarOpen(false)} className="self-end p-2 text-gray-400 hover:text-gray-600 transition">✕</button>
          <div className="flex flex-col items-center mt-4 mb-8">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-white shadow-md overflow-hidden relative">
                 {isUploading && (
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   </div>
                 )}
                 {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 text-indigo-600" />}
              </div>
              <button 
                onClick={() => fileInputRef.current.click()}
                className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg hover:bg-indigo-700 transition transform hover:scale-110"
              >
                <CameraIcon className="w-3.5 h-3.5" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpdate} className="hidden" accept="image/*" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 text-center mt-4">{user?.displayName || 'Patient'}</h3>
            <p className="text-gray-500 text-sm truncate w-full text-center">{user?.email}</p>
          </div>

          <div className="flex-1 space-y-2">
            <Link to="/my-records" onClick={() => setIsSidebarOpen(false)} className="flex items-center p-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium">
              <Clock className="w-5 h-5 mr-3 text-indigo-500" /> Appointment History
            </Link>
            <Link to="/book" onClick={() => setIsSidebarOpen(false)} className="flex items-center p-3 rounded-xl hover:bg-indigo-50 text-indigo-600 font-bold">
              <BookOpen className="w-5 h-5 mr-3" /> Book New Appointment
            </Link>
          </div>

          <button onClick={handleLogout} className="w-full py-4 mt-auto border-t border-gray-100 flex items-center justify-center text-red-500 font-bold hover:bg-red-50 transition rounded-xl">
             Logout
          </button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-90 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <nav className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo size="w-6 h-6" />
            <span>Menchie's Dental Clinic</span>
          </div>
          <div className="hidden md:flex space-x-8 text-lg font-medium">
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>Home</NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>About Us</NavLink>
            <NavLink to="/services" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>Services</NavLink>
            <Link to="/my-records" className="text-indigo-600 font-semibold transition">My Records</Link>
          </div>

          <div className="flex items-center">
            {!loading && (
              <>
                {user ? (
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex items-center space-x-2 p-1 pl-3 border border-gray-200 rounded-full hover:shadow-md transition bg-white group"
                  >
                    <span className="font-semibold text-gray-700 hidden sm:block">Profile</span>
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white overflow-hidden">
                       {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5" />}
                    </div>
                  </button>
                ) : (
                  <Link to="/auth" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                    Sign In
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

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
              className="bg-white p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col items-start space-y-4"
            >
              <div className={`p-3 rounded-xl bg-indigo-500/10 ${service.color}`}>
                <service.icon className="w-8 h-8"/>
              </div>
              <h3 className="text-xl font-bold text-gray-800">{service.title}</h3>
              <p className="text-sm text-gray-500 font-medium">Estimated price: {service.price}</p>
              <p className="text-gray-600 grow">{service.description}</p>
              <Link
                to={`/book?service=${encodeURIComponent(service.title)}`}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition"
              >
                Book Now
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
                <a href="#" className="block text-indigo-600 hover:underline">Facebook</a>
                <a href="#" className="block text-indigo-600 hover:underline">Instagram</a>
                <a href="#" className="block text-indigo-600 hover:underline">Twitter</a>
            </div>

           
            <div className="text-center md:text-left space-y-2">
                <h4 className="font-bold text-lg text-gray-800 mb-2">Our Location</h4>
                <p className="text-gray-600">Baguio City Assumption Road Shopper's Lane </p>
                <p className="text-gray-600">MenchieClinic@gmail.com</p>
                <p className="text-gray-600">+63 123 456 789</p>
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