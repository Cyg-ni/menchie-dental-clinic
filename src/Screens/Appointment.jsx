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
  const [submittedFirstName, setSubmittedFirstName] = useState('');

  // Fetch booked slots when date changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      setFetchingTimes(true);
      setFormData(prev => ({ ...prev, time: '' }));
      setTakenTimes([]);

      try {
        const q = query(
          appointmentsCollectionRef,
          where("scheduledDate", "==", formData.date)
        );
        const querySnapshot = await getDocs(q);
        const booked = querySnapshot.docs.map(doc => doc.data().scheduledTime);
        setTakenTimes(booked);
      } catch (error) {
        console.error("Error fetching booked slots:", error);
      } finally {
        setFetchingTimes(false);
      }
    };

    fetchBookedSlots();
  }, [formData.date]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'firstName' || name === 'lastName') {
      const nameRegex = /^[A-Za-z\s'-]*$/;
      if (!nameRegex.test(value)) {
        setNameErrors(prev => ({ ...prev, [name]: 'Invalid characters used.' }));
      } else {
        setNameErrors(prev => ({ ...prev, [name]: '' }));
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTimeSelect = (timeSlot) => {
    setFormData(prev => ({ ...prev, time: timeSlot }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nameErrors.firstName || nameErrors.lastName || !formData.firstName || !formData.lastName) {
      setSubmitStatus({ type: 'error', message: 'Please provide a valid First and Last name.' });
      return;
    }

    if (!formData.time) {
      setSubmitStatus({ type: 'error', message: 'Please select a time slot.' });
      return;
    }

    setLoading(true);
    setSubmitStatus(null);

    try {
      if (takenTimes.includes(formData.time)) {
        setSubmitStatus({ type: 'error', message: `This slot is no longer available.` });
        setLoading(false);
        return;
      }

      const appointmentData = {
        createdAt: Timestamp.fromDate(new Date()),
        dateTime: Timestamp.fromDate(new Date(`${formData.date}T${formData.time}:00`)),
        scheduledDate: formData.date,
        scheduledTime: formData.time,
        patientFirstName: formData.firstName,
        patientLastName: formData.lastName,
        patientFullName: `${formData.firstName} ${formData.lastName}`,
        patientEmail: formData.email,
        serviceType: formData.service,
        patientNotes: formData.message,
        status: {
          isPending: "Approval Pending",
          isScheduled: "Appointment Requested"
        },
      };

      const docRef = await addDoc(appointmentsCollectionRef, appointmentData);
      
      setSubmittedFirstName(formData.firstName);
      setSubmitStatus({
        type: 'success',
        message: `Thank you, ${formData.firstName}! Your request is confirmed. ID: ${docRef.id}`
      });

      setTakenTimes(prev => [...prev, formData.time]);
      setFormData({
        firstName: '', lastName: '', email: '', service: '',
        date: new Date().toISOString().split('T')[0],
        time: '', message: ''
      });

    } catch (error) {
      setSubmitStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Navbar */}
      <section className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo size="w-6 h-6" />
            <span>Menchie's Dental Clinic</span>
          </div>
          <nav className="hidden md:flex space-x-8 text-lg">
            <Link to="/" className="text-gray-600 hover:text-indigo-600 transition duration-150">Home</Link>
            <Link to="/about" className="text-gray-600 hover:text-indigo-600 transition duration-150">About Us</Link>
            <Link to="/services" className="text-gray-600 hover:text-indigo-600 transition duration-150">Services</Link>
          </nav>
          <div className="hidden sm:block">
            <Link to="/book" className="flex items-center px-4 py-2 bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition duration-200 text-lg">
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
          <p className="text-lg text-gray-600 mt-2">Secure your visit with Menchie's Dental Clinic in simple steps.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Information</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Separated Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-indigo-500 transition duration-150 ${nameErrors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="First Name"
                  />
                  {nameErrors.firstName && <p className="mt-1 text-xs text-red-600">{nameErrors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-indigo-500 transition duration-150 ${nameErrors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Last Name"
                  />
                  {nameErrors.lastName && <p className="mt-1 text-xs text-red-600">{nameErrors.lastName}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <select
                    name="service"
                    id="service"
                    value={formData.service}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select --</option>
                    {serviceOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="date"
                      id="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"/>
                  </div>
                </div>
              </div>

              {/* Time Slot Grid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots {fetchingTimes && <span className="text-gray-400 ml-2 text-xs">(Checking...)</span>}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TIME_SLOTS.map((slot) => {
                    const isTaken = takenTimes.includes(slot);
                    const isSelected = formData.time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isTaken}
                        onClick={() => handleTimeSelect(slot)}
                        className={`py-2 px-2 rounded-lg text-sm font-semibold transition-all border ${
                          isTaken ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' :
                          isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' :
                          'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  name="message" id="message" rows="3"
                  value={formData.message} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500"
                  placeholder="Any specific concerns?"
                ></textarea>
              </div>

              {submitStatus && (
                <div className={`p-4 rounded-xl text-center font-medium ${submitStatus.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {submitStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || submitStatus?.type === 'success' || !formData.time || !!nameErrors.firstName || !!nameErrors.lastName}
                className={`w-full flex items-center justify-center px-6 py-3 font-semibold rounded-xl shadow-lg transition duration-200 text-lg ${
                  loading || submitStatus?.type === 'success' || !formData.time || !!nameErrors.firstName || !!nameErrors.lastName
                  ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Submitting...' : 'Confirm Appointment Request'}
              </button>
            </form>
          </div>

          <div className="hidden lg:block relative">
            <img
              src="https://media.istockphoto.com/id/1311280344/photo/asian-dentist-explaining-tooth-x-rays-to-a-patient-with-digital-tablet-asian-young-attractive.jpg?s=612x612&w=0&k=20&c=eHIfwTNNrsbgdz3RwudbKhdGd9WM7EaeIdzcuktL5xE="
              alt="Dentist"
              className="w-full h-full object-cover rounded-2xl shadow-2xl border-4 border-white"
            />
          </div>
        </div>
      </main>

      <footer className="w-full py-4 mt-16 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Appointment;