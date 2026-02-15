import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { auth, storage } from '../firebase-config'; 
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- Icon Components ---

const BookOpen = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    <path d="M20 17H4" />
    <path d="M7 12V3h5l4 4v5" />
  </svg>
);

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const Clock = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CameraIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
      const storageRef = ref(storage, `user_profiles/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      await updateProfile(auth.currentUser, { photoURL });
      setUser({ ...auth.currentUser, photoURL }); 
      alert("Profile photo updated!");
    } catch (error) {
      console.error("Error updating photo:", error);
      alert("Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const ExternalLogo = ({ size = 'w-6 h-6', className = '' }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
    alt="Dental Clinic Logo" 
    className={`${size} ${className}`} 
    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/24x24/f5f5f5/a0aec0?text=Logo" }}
  />
);


  return (
    <div className="min-h-screen bg-gray-50 font-inter overflow-x-hidden">

      {/* --- PROFILE SIDEBAR --- */}
      <div className={`fixed inset-y-0 right-0 z-[100] w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
              {/* Edit Button */}
              <button 
                onClick={() => fileInputRef.current.click()}
                className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg hover:bg-indigo-700 transition transform hover:scale-110"
              >
                <CameraIcon className="w-3.5 h-3.5" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpdate} className="hidden" accept="image/*" />
            </div>
            
            <h3 className="font-bold text-xl text-gray-900 text-center mt-4">{user?.displayName || "Patient"}</h3>
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

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-[90] backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      {/* --- NAVBAR --- */}
      <nav className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo size="w-6 h-6" />
            <span>Menchie's Dental Clinic</span>
          </div>
          
          <div className="hidden md:flex space-x-8 text-lg font-medium">
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>Home</NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>About Us</NavLink> 
            <NavLink to="/services" className={({ isActive }) => isActive ? 'text-gray-600 hover:text-indigo-600 transition' : 'text-gray-600 hover:text-indigo-600 transition'}>Services</NavLink>
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
        
        <section className="grid md:grid-cols-2 gap-12 items-start mb-20">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              About <span className="text-indigo-600">Menchie's Dental Clinic</span>
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              At Menchie's Dental Clinic, we are committed to providing exceptional dental care that prioritizes your health, comfort, and peace of mind. Our mission is to foster lasting relationships with our patients by delivering personalized treatments in a welcoming and state-of-the-art environment.
            </p>
            
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded-r-xl">
               <p className="text-indigo-900 font-bold uppercase text-xs tracking-wider mb-1">Visit us at:</p>
               <p className="text-indigo-800 font-medium">
                 Unit 17-A Ground Floor Shopper's Lane Building<br/>
                 Lower General Luna Road, Baguio City
               </p>
            </div>
          </div>
          <div className="bg-white rounded-3xl h-[450px] overflow-hidden shadow-2xl relative border-4 border-white">
            <iframe
              title="Google Maps Location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.066468087912!2d120.5960309!3d16.4111306!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3391a166297371d3%3A0xc3f9a791a8775494!2sShopper's%20Lane!5e0!3m2!1sen!2sph!4v1700000000000"
            ></iframe>
          </div>
        </section>

        <section className="text-center mb-20">
          <h2 className="text-4xl font-bold text-gray-900 mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-lg flex flex-col items-center">
              <SmileIcon className="w-12 h-12 text-indigo-500 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Stress-Free</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Our clinic is designed to be a calming oasis, with comfortable amenities and a gentle approach.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-lg flex flex-col items-center">
              <WalletIcon className="w-12 h-12 text-indigo-500 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Affordable</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Quality dental care shouldn't break the bank. We offer transparent pricing and flexible options.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-lg flex flex-col items-center">
              <HeartIcon className="w-12 h-12 text-indigo-500 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Personalized</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Every smile is unique. We craft bespoke treatment plans for the best possible outcomes.
              </p>
            </div>
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