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

const Stethoscope = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 18l-4 4-2-2 4-4" /><path d="M15 22V8.5l-2-2-2 2V22" /><path d="M18 10a6 6 0 0 0-12 0" /><circle cx="12" cy="18" r="4" />
  </svg>
);

const Sparkles = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.91 5.89L20 10l-6.09 1.11L12 17l-1.91-5.89L4 10l6.09-1.11L12 3z" />
    <path d="M5 3l.64 1.36L7 5l-1.36.64L5 7l-.64-1.36L3 5l1.36-.64L5 3z" />
    <path d="M19 17l.64 1.36L21 19l-1.36.64L19 21l-.64-1.36L17 19l1.36-.64L19 17z" />
  </svg>
);

const Wrench = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-3.76 3.76a2 2 0 0 1-2.83 0L3 19a2 2 0 0 1 0-2.83l3.76-3.76a6 6 0 0 1 7.94-7.94z" />
  </svg>
);

const AlarmClock = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M5 3L2 6" /><path d="M22 6l-3-3" /><path d="M6.38 18.7l-.44.44" /><path d="M17.62 18.7l.44.44" />
  </svg>
);

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const CameraIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
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

const services = [
  { icon: Stethoscope, title: "Preventative Care", description: "Routine check-ups, cleanings, X-rays, and fluoride treatments to maintain long-term oral health.", details: "Our preventative program includes a comprehensive exam, oral cancer screening, and digital X-rays to detect issues before they become painful. Professional cleaning removes tartar and plaque that brushing alone cannot reach.", color: "text-green-500" },
  { icon: Sparkles, title: "Cosmetic Dentistry", description: "Professional teeth whitening, veneers, and smile makeovers to boost your confidence.", details: "From laser whitening to porcelain veneers, we offer customized aesthetic plans. Veneers can correct gaps, chips, or permanent stains, giving you a symmetrical, bright smile.", color: "text-pink-500" },
  { icon: Wrench, title: "Restorative Dentistry", description: "Repair and restore damaged teeth using fillings, crowns, bridges, and implants.", details: "We use tooth-colored composite resins for fillings and durable porcelain for crowns. If you're missing teeth, our bridge and implant solutions look and function just like natural teeth.", color: "text-blue-500" },
  { icon: AlarmClock, title: "Emergency Care", description: "Prompt care for toothaches, broken teeth, and unexpected dental injuries.", details: "Dental emergencies don't wait. We prioritize same-day appointments for patients in pain, dealing with abscesses, or trauma to the mouth to prevent further complications.", color: "text-red-500" },
  { icon: Wrench, title: "Root Canal Therapy", description: "Expert treatment to save a damaged or infected tooth and alleviate severe pain.", details: "Modern root canal therapy is nearly pointless. By removing the infected pulp and sealing the tooth, we stop the infection and allow you to keep your natural tooth instead of extracting it.", color: "text-indigo-500" },
  { icon: Stethoscope, title: "Children's Dentistry", description: "Gentle and friendly dental care for children, focusing on education and comfort.", details: "We create a fun environment for kids. Our team focuses on preventative sealants and fluoride while teaching children how to brush and floss effectively to ensure a lifetime of healthy smiles.", color: "text-yellow-500" },
  { icon: Sparkles, title: "Orthodontics", description: "Straighten your smile discreetly using clear aligners or traditional braces.", details: "Whether you prefer traditional metal braces or clear aligners, we provide solutions for crowding, spacing, and bite alignment. Every plan is mapped out digitally for precise results.", color: "text-purple-500" },
  { icon: Wrench, title: "Gum Treatment", description: "Comprehensive care and deep cleanings to combat gum disease and bone loss.", details: "Gum health is the foundation of your smile. We provide Scaling and Root Planing (deep cleaning) to remove bacteria under the gumline and help reverse the effects of gingivitis and periodontitis.", color: "text-cyan-500" },
];

const Services = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
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
              <ClockIcon className="w-5 h-5 mr-3 text-indigo-500" /> Appointment History
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
      <section className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo />
            <span>Menchie's Dental Clinic</span>
          </div>
          <nav className="hidden md:flex space-x-8 text-lg font-medium">
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>Home</NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>About Us</NavLink> 
            <NavLink to="/services" className={({ isActive }) => isActive ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600 transition'}>Services</NavLink>
            <Link to="/my-records" className="text-indigo-600 font-semibold transition">My Records</Link> 
          </nav>

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
                  <Link to="/auth" className="px-8 py-2.5 border-2 border-indigo-600 text-indigo-600 font-extrabold rounded-xl hover:bg-indigo-50 transition duration-200">
                    Sign In
                  </Link>
                )}
              </>
            )}
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

        {/* --- SERVICE CARDS --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              onClick={() => setSelectedService(service)}
              className="group cursor-pointer bg-white p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col items-start space-y-3"
            >
              <div className={`p-3 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 transition duration-300 ${service.color} group-hover:text-white`}>
                <service.icon className="w-8 h-8"/>
              </div>
              <h3 className="text-xl font-bold text-gray-800">{service.title}</h3>
              <p className="text-gray-600 flex-grow line-clamp-3">{service.description}</p>
              <span className="text-indigo-600 font-bold text-sm flex items-center group-hover:translate-x-1 transition-transform">
                View Details 
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </div>
          ))}
        </section>

        {/* --- SERVICE MODAL --- */}
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedService(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedService(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className={`w-16 h-16 p-4 rounded-2xl bg-indigo-50 mb-6 ${selectedService.color}`}>
                <selectedService.icon className="w-full h-full" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedService.title}</h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-8">{selectedService.details}</p>
              <div className="flex space-x-3">
                <Link to="/book" className="flex-1 bg-indigo-600 text-white text-center py-4 rounded-2xl font-bold hover:bg-indigo-700 transition">Book This Service</Link>
                <button onClick={() => setSelectedService(null)} className="flex-1 border-2 border-gray-200 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-50 transition">Go Back</button>
              </div>
            </div>
          </div>
        )}

        <section className="mt-20 bg-indigo-600 text-white p-10 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-6 md:space-y-0">
            <div className="md:max-w-xl">
                <h2 className="text-3xl font-bold mb-2">Ready for a Healthier Smile?</h2>
                <p className="text-indigo-100">Contact us today to schedule your first appointment and discover personalized care.</p>
            </div>
            <Link to="/book" className="flex items-center px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-gray-100 transition duration-200 text-lg whitespace-nowrap">
                <BookOpen className="w-5 h-5 mr-2" />
                Book Your Visit
            </Link>
        </section>
      </main>

      <footer className="w-full py-4 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Services;