import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { db, storage, auth } from '../firebase-config'; // Added auth
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth'; // Added for profile photo detection
import emailjs from '@emailjs/browser'; 

// --- SVG Components ---
const BookOpen = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    <path d="M20 17H4" />
    <path d="M7 12V3h5l4 4v5" />
  </svg>
);

const CalendarIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

  const ExternalLogo = ({ size = 'w-6 h-6', className = '' }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
    alt="Dental Clinic Logo" 
    className={`${size} ${className}`} 
    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/24x24/f5f5f5/a0aec0?text=Logo" }}
  />
);

const serviceOptions = [
  "Preventative Care & Hygiene",
  "Cosmetic Dentistry",
  "Restorative Dentistry",
  "Emergency Dental Services",
  "Root Canal Therapy",
  "Children's Dentistry",
  "Orthodontics & Aligners",
  "Gum Disease Treatment",
  "Routine Check-up & Cleaning",
  "Teeth Whitening (Cosmetic)",
  "Dental Implants Consultation",
  "Orthodontics Consultation",
  "Other / Not Sure"
];

const TIME_SLOTS = ["08:30", "09:45", "11:00", "13:00", "14:30", "15:45", "17:00"];
const appointmentsCollectionRef = collection(db, "appointments");
const RETAINED_FORM_KEY = 'appointmentRetainedMedicalFields';

const asDisplayText = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return value.conditionNotes || value.notes || '';
  }
  return '';
};

const asStringArray = (value) => {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }
  return [];
};

const Appointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryService = new URLSearchParams(location.search).get('service') || '';

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', age: '', gender: '',
    occupation: '', maritalStatus: '', address: '', allergies: '',
    conditionNotes: '', currentMeds: '', isPregnant: false, isSmoking: false,
    service: queryService, date: new Date().toISOString().split('T')[0], time: '', message: ''
  });

  // --- Image States ---
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newAppointmentId, setNewAppointmentId] = useState('');
  const [takenTimes, setTakenTimes] = useState([]);
  const [fetchingTimes, setFetchingTimes] = useState(false);
  const [errors, setErrors] = useState({});
  const [retainedLoaded, setRetainedLoaded] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(RETAINED_FORM_KEY);
      if (!cached) {
        setRetainedLoaded(true);
        return;
      }

      const retained = JSON.parse(cached);
      setFormData(prev => ({
        ...prev,
        age: retained.age ?? prev.age,
        gender: retained.gender ?? prev.gender,
        allergies: retained.allergies ?? prev.allergies,
        currentMeds: retained.currentMeds ?? prev.currentMeds,
        conditionNotes: retained.conditionNotes ?? prev.conditionNotes,
        isPregnant: retained.isPregnant ?? prev.isPregnant,
        isSmoking: retained.isSmoking ?? prev.isSmoking,
      }));
    } catch (error) {
      console.error('Failed to load retained appointment data:', error);
    } finally {
      setRetainedLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!retainedLoaded) return;
    try {
      localStorage.setItem(
        RETAINED_FORM_KEY,
        JSON.stringify({
          age: formData.age,
          gender: formData.gender,
          allergies: formData.allergies,
          currentMeds: formData.currentMeds,
          conditionNotes: formData.conditionNotes,
          isPregnant: formData.isPregnant,
          isSmoking: formData.isSmoking,
        })
      );
    } catch (error) {
      console.error('Failed to save retained appointment data:', error);
    }
  }, [
    formData.age,
    formData.gender,
    formData.allergies,
    formData.currentMeds,
    formData.conditionNotes,
    formData.isPregnant,
    formData.isSmoking,
    retainedLoaded,
  ]);

  // NEW: Detect if user is logged in, then load profile data and photo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const loadPatientProfile = async () => {
        try {
          const patientDoc = await getDoc(doc(db, 'patients', user.uid));
          const profileData = patientDoc.exists() ? patientDoc.data() : {};
          const profileName =
            profileData.patientFullName ||
            profileData.fullName ||
            profileData.name ||
            `${profileData.patientFirstName || profileData.firstName || ''} ${profileData.patientLastName || profileData.lastName || ''}`.trim();
          const displayName = user.displayName || profileName || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
          const nameParts = displayName.split(' ').filter(Boolean);
          const medicalHistory = profileData.medicalHistory || {};
          const allergiesValue = medicalHistory.Allergies ?? medicalHistory.allergies;
          const medsValue = medicalHistory.currentMedications ?? medicalHistory.currentMeds;
          const conditionNotesValue = medicalHistory.conditionNotes ?? medicalHistory.notes;

          
          setImagePreview(profileData.photoURL || profileData.photo || profileData.image || null);
          setFormData(prev => {
            const firstNameValue = prev.firstName || nameParts[0] || profileData.firstName || profileData.patientFirstName || '';
            const lastNameValue = prev.lastName || nameParts.slice(1).join(' ') || profileData.lastName || profileData.patientLastName || '';
            return {
              ...prev,
              firstName: firstNameValue,
              lastName: lastNameValue,
              email: prev.email || user.email || profileData.email || profileData.contactInfo || '',
              age: prev.age || profileData.age || '',
              gender: prev.gender || profileData.gender || '',
              address: prev.address || profileData.address || '',
              phone: prev.phone || profileData.phone || profileData.phone_num || '',
              allergies: prev.allergies || asDisplayText(allergiesValue),
              currentMeds: prev.currentMeds || asDisplayText(medsValue),
              conditionNotes: prev.conditionNotes || asDisplayText(conditionNotesValue),
              isPregnant: prev.isPregnant || profileData.isPregnant || false,
              isSmoking: prev.isSmoking || profileData.isSmoking || profileData.smokingStatus || false,
            };
          });
        } catch (error) {
          console.error('Failed to load patient profile:', error);
        }
      };

      loadPatientProfile();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      setFetchingTimes(true);
      setFormData(prev => ({ ...prev, time: '' }));
      setTakenTimes([]);
      try {
        const q = query(appointmentsCollectionRef, where("scheduledDate", "==", formData.date));
        const querySnapshot = await getDocs(q);
        const booked = querySnapshot.docs.map(doc => doc.data().scheduledTime);
        setTakenTimes(booked);
      } catch (error) {
        console.error("Error fetching slots:", error);
      } finally {
        setFetchingTimes(false);
      }
    };
    fetchBookedSlots();
  }, [formData.date]);

  const validateField = (name, value) => {
    let error = '';
    if (name === 'firstName' || name === 'lastName') {
      if (!/^[A-Za-z\s'-]*$/.test(value)) error = 'Only letters allowed.';
    }
    if (name === 'email') {
      if (!/\S+@\S+\.\S+/.test(value)) error = 'Invalid email format.';
    }
    if (name === 'phone') {
      if (!/^\+?[0-9]{10,15}$/.test(value)) error = 'Invalid phone number.';
    }
    if (name === 'age') {
      if (value < 0 || value > 120) error = 'Enter a valid age.';
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    validateField(name, finalValue);
  };

  // --- Image Handler ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredChecks = [
      validateField('firstName', formData.firstName),
      validateField('lastName', formData.lastName),
      validateField('email', formData.email),
      validateField('phone', formData.phone),
      formData.age ? validateField('age', formData.age) : true,
    ];

    const hasErrors = Object.values(errors).some(err => err !== '');
    if (hasErrors || requiredChecks.includes(false) || !formData.time) {
      setSubmitStatus({ 
        type: 'error', 
        message: !formData.time ? 'Please select a time slot.' : 'Please fix the errors before submitting.' 
      });
      return;
    }

    setLoading(true);
    setSubmitStatus(null);

    try {
      // Use existing profile photo URL by default if no new file is uploaded
      let photoURL = imagePreview && !imageFile ? imagePreview : "";

      // 1. UPLOAD NEW IMAGE IF SELECTED
      if (imageFile) {
        const reader = new FileReader();
        photoURL = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64String = reader.result;
            console.log('Image converted to base64, size:', base64String.length);
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      }

      // 2. SAVE TO FIREBASE
      const currentUser = auth.currentUser;
      const normalizedEmail = formData.email?.trim().toLowerCase();
      const allergiesArray = asStringArray(formData.allergies || formData.conditionNotes);
      const currentMedsArray = asStringArray(formData.currentMeds);
      const appointmentData = {
        createdAt: Timestamp.fromDate(new Date()),
        dateTime: Timestamp.fromDate(new Date(`${formData.date}T${formData.time}:00`)),
        scheduledDate: formData.date,
        scheduledTime: formData.time,
        patientUid: currentUser?.uid || null,
        patientFirstName: formData.firstName,
        patientLastName: formData.lastName,
        patientFullName: `${formData.firstName} ${formData.lastName}`,
        patientEmail: normalizedEmail,
        patientPhone: formData.phone,
        patientPhoto: photoURL, 
        serviceType: formData.service,
        status: { isPending: "Approval Pending", isScheduled: "Appointment Requested" },
        age: formData.age,
        gender: formData.gender,
        medicalHistory: {
          Allergies: { conditionNotes: formData.allergies || formData.conditionNotes || '' },
          currentMedications: formData.currentMeds || '',
          conditionNotes: formData.conditionNotes || '',
          isSmoking: formData.isSmoking,
          isPregnant: formData.isPregnant,
        },
      };
      const docRef = await addDoc(appointmentsCollectionRef, appointmentData);
      const generatedId = docRef.id; 

      if (currentUser?.uid) {
        const firstNameValue = formData.firstName || '';
        const lastNameValue = formData.lastName || '';
        const fullNameValue = `${firstNameValue} ${lastNameValue}`.trim();
        await setDoc(doc(db, 'patients', currentUser.uid), {
          age: formData.age || '',
          gender: formData.gender || '',
          contactInfo: formData.email || '',
          phone_num: formData.phone || '',
          patientFirstName: firstNameValue,
          patientLastName: lastNameValue,
          patientFullName: fullNameValue,
          firstName: firstNameValue,
          lastName: lastNameValue,
          fullName: fullNameValue,
          name: fullNameValue,
          medicalHistory: {
            Allergies: allergiesArray,
            currentMedications: currentMedsArray,
            conditionNotes: formData.conditionNotes || ''
          },
          isPregnant: !!formData.isPregnant,
          smokingStatus: !!formData.isSmoking,
          isSmoking: !!formData.isSmoking,
        }, { merge: true });
      }
      
      console.log('Appointment saved with data:', appointmentData);
      
      setNewAppointmentId(generatedId);
      setTakenTimes(prev => [...prev, formData.time]);

      // 3. ATTEMPT EMAIL
      try {
        await emailjs.send(
          'service_yei2sk7',
          'template_tqviuem',
          {
            to_name: formData.firstName,
            to_email: formData.email,
            service_type: formData.service,
            app_date: formData.date,
            app_time: formData.time,
            appointment_id: generatedId,
            base_url: window.location.origin, 
          },
          'Bw_dLBXg4UIfg4mUh'
        );
      } catch (emailErr) {
        console.error("EmailJS Error:", emailErr);
      }

      setShowModal(true); 
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: error.text || error.message || "Something went wrong with the connection." 
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (name) => `w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 outline-none transition-colors ${
    errors[name] ? 'border-red-500 bg-red-50' : 'border-gray-300'
  }`;

  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-900 relative animate-fade-in">
      
      {/* SUCCESS MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6">
            <div className="flex justify-center animate-bounce"><CheckCircle /></div>
            <div>
              <h3 className="text-2xl font-bold">Appointment Requested!</h3>
              <p className="text-gray-500 mt-2">Check your inbox for a confirmation from Menchie's Clinic.</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => navigate(`/track/${newAppointmentId}`)}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition"
              >
                Track My Status
              </button>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-sm hover:underline w-full">Close</button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 font-semibold text-xl">
            <ExternalLogo />
            <span>Menchie's Dental Clinic</span>
          </div>
          <nav className="hidden md:flex space-x-8 text-lg">
            <Link to="/" className="text-gray-600 hover:text-indigo-600 transition">Home</Link>
            <Link to="/about" className="text-gray-600 hover:text-indigo-600 transition">About Us</Link>
            <Link to="/services" className="text-gray-600 hover:text-indigo-600 transition">Services</Link>
            <Link to="/my-records" className="text-indigo-600 font-semibold transition">My Records</Link> 
          </nav>
          <div className="hidden sm:block">
            <Link to="/book" className="flex items-center px-4 py-2 bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition text-lg">
              <BookOpen className="w-5 h-5 mr-2" />
              Book Appointment
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold">
            Book Your <span className="text-indigo-600">Appointment</span>
          </h1>
          <p className="text-lg text-gray-600 mt-2">Complete your profile to help us prepare for your visit.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100 space-y-8">
            
            {/* Section 1: Patient Information */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Patient Information</h2>
                {/* Profile Picture: Reflects profile photo but remains editable */}
                <div className="relative group">
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">Photo</span>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1 rounded-full cursor-pointer shadow-md hover:bg-indigo-700 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7v14"/></svg>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} autoComplete="given-name" onChange={handleChange} required className={inputClass('firstName')} />
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                </div>
                <div className="space-y-1">
                  <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} autoComplete="family-name" onChange={handleChange} required className={inputClass('lastName')} />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <input type="email" name="email" placeholder="Email Address" value={formData.email} autoComplete="email" onChange={handleChange} required className={inputClass('email')} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
                <div className="space-y-1">
                  <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} autoComplete="tel" onChange={handleChange} required className={inputClass('phone')} />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
                <div className="space-y-1">
                  <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleChange} className={inputClass('age')} />
                  {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
                </div>
                <input type="text" name="address" placeholder="Home Address" value={formData.address} autoComplete="street-address" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg sm:col-span-2" />
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Section 2: Medical History */}
            <div>
              <h2 className="text-2xl font-bold mb-6 border-t pt-6">Medical History</h2>
              <div className="space-y-4">
                <input type="text" name="allergies" placeholder="Allergies (e.g. Penicillin)" value={formData.allergies} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="text" name="currentMeds" placeholder="Current Medications" value={formData.currentMeds} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <textarea name="conditionNotes" placeholder="Medical Condition Notes" value={formData.conditionNotes} onChange={handleChange} rows="2" className="w-full px-4 py-2 border border-gray-300 rounded-lg"></textarea>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="isPregnant" checked={formData.isPregnant} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded" />
                    <span>Tick if Pregnant</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="isSmoking" checked={formData.isSmoking} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded" />
                    <span>Tick if Smoker</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Scheduling */}
          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100 space-y-6">
            <h2 className="text-2xl font-bold mb-6">Schedule Your Visit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Service</label>
                <select name="service" value={formData.service} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-indigo-500">
                  <option value="">-- Choose a Service --</option>
                  {serviceOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                <div className="relative">
                  <input type="date" name="date" value={formData.date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots {fetchingTimes && <span className="text-gray-400 ml-2 text-xs animate-pulse">(Checking...)</span>}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot} type="button"
                      disabled={takenTimes.includes(slot)}
                      onClick={() => setFormData(p => ({ ...p, time: slot }))}
                      className={`py-2 px-2 rounded-lg text-sm font-semibold transition-all border ${
                        takenTimes.includes(slot) ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed line-through' :
                        formData.time === slot ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' :
                        'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {submitStatus && (
                <div className={`p-4 rounded-xl text-center font-medium ${submitStatus.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {submitStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 font-bold rounded-xl shadow-lg transition text-lg ${
                  loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Processing...' : 'Request Appointment'}
              </button>
            </div>
          </div>
        </form>
      </main>

      <footer className="w-full py-4 mt-16 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Appointment;