import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom'; 
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

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CameraIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

// --- Logo Component (STRICT) ---
const ExternalLogo = ({ size = 'w-6 h-6', className = '' }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
    alt="Dental Clinic Logo" 
    className={`${size} ${className}`} 
    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/24x24/f5f5f5/a0aec0?text=Logo" }}
  />
);

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef(null);

  const carouselImages = [
    "https://images.pexels.com/photos/3779705/pexels-photo-3779705.jpeg?cs=srgb&dl=pexels-olly-3779705.jpg&fm=jpg", 
    "https://mysierradental.com/wp-content/uploads/2024/09/first-dentist-visit-guide.jpg",
    "https://img.freepik.com/free-photo/photo-smiling-dentist-standing-with-arms-crossed-with-her-colleague-showing-okay-sign_496169-1043.jpg?semt=ais_hybrid&w=740&q=80",
    "https://st2.depositphotos.com/1518767/6527/i/450/depositphotos_65279377-stock-photo-smiling-co-workers-in-a.jpg",
  ];

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-900 overflow-x-hidden">
      
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

          <button onClick={handleLogout} className="mt-auto flex items-center justify-center p-4 w-full bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition duration-200">
            Logout
          </button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-[90] backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      {/* --- NAVBAR --- */}
      <nav className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo />
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
            <button onClick={() => setIsHoursOpen(true)} className="flex items-center px-6 py-3 bg-gray-800 text-white font-medium rounded-xl shadow-xl hover:bg-gray-900 transition text-lg">
              <Clock className="w-5 h-5 mr-2" /> Working Hours
            </button>
            <button onClick={() => setIsContactOpen(true)} className="flex items-center px-6 py-3 bg-white text-gray-800 border-2 border-gray-300 font-medium rounded-xl hover:bg-gray-100 transition text-lg">
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

      {/* --- MODALS (Hours & Contact) --- */}
      {isHoursOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsHoursOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative" onClick={e => e.stopPropagation()}>
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

      {isContactOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsContactOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsContactOpen(false)} className="absolute top-4 right-4 text-gray-400 text-xl">✕</button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Phone className="w-6 h-6 mr-2 text-indigo-600" /> Get in Touch
            </h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Phone className="w-6 h-6" /></div>
                <div><p className="text-sm text-gray-500 font-medium">Call/Text</p><a href="tel:+1234567890" className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition">(123) 456-7890</a></div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Mail className="w-6 h-6" /></div>
                <div><p className="text-sm text-gray-500 font-medium">Email</p><a href="mailto:info@menchiedental.com" className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition">info@menchiedental.com</a></div>
              </div>
            </div>
            <a href="https://www.facebook.com/menchieamor.a.dangla" target="_blank" rel="noopener noreferrer">
              <button className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">Message Us Directly</button>
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