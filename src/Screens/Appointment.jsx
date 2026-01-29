import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase-config';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';

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

const ExternalLogo = ({ size = 'w-6 h-6', className = '' }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/512/103/103386.png"
    alt="Dental Clinic Logo"
    className={`${size} ${className}`}
    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/24x24/f5f5f5/a0aec0?text=Logo" }}
  />
);

const serviceOptions = [
  "Routine Check-up & Cleaning",
  "Teeth Whitening (Cosmetic)",
  "Dental Implants Consultation",
  "Emergency Visit (Pain/Injury)",
  "Orthodontics Consultation",
  "Other / Not Sure"
];

const TIME_SLOTS = ["08:30", "09:45", "11:00", "13:00", "14:30", "15:45", "17:00"];

const appointmentsCollectionRef = collection(db, "appointments");

const Appointment = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    occupation: '',
    maritalStatus: '',
    address: '',
    allergies: '',
    conditionNotes: '',
    currentMeds: '',
    isPregnant: false,
    isSmoking: false,
    service: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [takenTimes, setTakenTimes] = useState([]);
  const [fetchingTimes, setFetchingTimes] = useState(false);
  const [nameErrors, setNameErrors] = useState({ firstName: '', lastName: '' });

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'firstName' || name === 'lastName') {
      const nameRegex = /^[A-Za-z\s'-]*$/;
      if (!nameRegex.test(value)) {
        setNameErrors(prev => ({ ...prev, [name]: 'Invalid characters.' }));
      } else {
        setNameErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.time) {
      setSubmitStatus({ type: 'error', message: 'Please select a time slot.' });
      return;
    }

    setLoading(true);
    setSubmitStatus(null);

    try {
      const appointmentData = {
        createdAt: Timestamp.fromDate(new Date()),
        dateTime: Timestamp.fromDate(new Date(`${formData.date}T${formData.time}:00`)),
        scheduledDate: formData.date,
        scheduledTime: formData.time,
        patientFirstName: formData.firstName,
        patientLastName: formData.lastName,
        patientFullName: `${formData.firstName} ${formData.lastName}`,
        patientEmail: formData.email,
        patientPhone: formData.phone,
        address: formData.address,
        age: formData.age,
        gender: formData.gender,
        occupation: formData.occupation,
        maritalStatus: formData.maritalStatus,
        isPregnant: formData.isPregnant,
        isSmoking: formData.isSmoking,
        medicalHistory: {
          allergies: formData.allergies,
          conditionNotes: formData.conditionNotes,
          currentMeds: formData.currentMeds
        },
        serviceType: formData.service,
        patientNotes: formData.message,
        status: { isPending: "Approval Pending", isScheduled: "Appointment Requested" },
      };

      const docRef = await addDoc(appointmentsCollectionRef, appointmentData);
      setSubmitStatus({ type: 'success', message: `Confirmed! ID: ${docRef.id}` });
      setTakenTimes(prev => [...prev, formData.time]);
    } catch (error) {
      setSubmitStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Navbar - Retained design with Book Button */}
      <section className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo size="w-6 h-6" />
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
          <h1 className="text-4xl font-extrabold text-gray-900">
            Book Your <span className="text-indigo-600">Appointment</span>
          </h1>
          <p className="text-lg text-gray-600 mt-2">Complete your profile to help us prepare for your visit.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100 space-y-8">
            
            {/* Section 1: Patient Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500" />
                <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500" />
                <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500" />
                <input type="tel" name="phone" placeholder="Phone Number" onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500" />
                <input type="text" name="address" placeholder="Home Address" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 sm:col-span-2" />
                <input type="number" name="age" placeholder="Age" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500" />
                <select name="gender" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Section 2: Medical History */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-t pt-6">Medical History</h2>
              <div className="space-y-4">
                <input type="text" name="allergies" placeholder="Allergies (e.g. Penicillin)" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <input type="text" name="currentMeds" placeholder="Current Medications" onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                <textarea name="conditionNotes" placeholder="Medical Condition Notes" onChange={handleChange} rows="2" className="w-full px-4 py-2 border border-gray-300 rounded-lg"></textarea>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input type="checkbox" name="isPregnant" onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded" />
                    <span>Is Pregnant?</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input type="checkbox" name="isSmoking" onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded" />
                    <span>Smoker?</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Scheduling - Mellow Design */}
          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Schedule Your Visit</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Service</label>
                <select name="service" onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-indigo-500">
                  <option value="">-- Choose a Service --</option>
                  {serviceOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                <div className="relative">
                  <input type="date" name="date" value={formData.date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots {fetchingTimes && <span className="text-gray-400 ml-2 text-xs">(Checking...)</span>}
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
                disabled={loading || submitStatus?.type === 'success'}
                className={`w-full py-4 font-bold rounded-xl shadow-lg transition text-lg ${
                  loading || submitStatus?.type === 'success' ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
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