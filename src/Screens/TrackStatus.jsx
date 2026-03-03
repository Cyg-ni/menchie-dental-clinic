import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase-config';
import { doc, onSnapshot } from 'firebase/firestore';

const TrackStatus = () => {
  const { id } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, "appointments", id);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppointment({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!appointment) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <h2 className="text-2xl font-bold text-gray-800">Appointment Not Found</h2>
      <p className="text-gray-600 mt-2">We couldn't find an appointment with the ID: <br/><span className="font-mono text-indigo-600">{id}</span></p>
      <Link to="/" className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 transition">Return Home</Link>
    </div>
  );

  // Status mapping logic
  const isApproved = appointment.status?.isScheduled === "Scheduled";
  const isComplete = appointment.status?.isComplete === "Complete";
  const isDeclined = appointment.status?.isScheduled === "Declined";

  // LOGIC: Determine the message based on priority (Custom Note > Status Default)
  const getClinicMessage = () => {
    if (appointment.status?.trackingNote) return appointment.status.trackingNote;
    
    if (isDeclined) return "We're sorry, but we cannot accommodate this time slot. Please contact our clinic to reschedule.";
    if (isComplete) return "Thank you for visiting! Your dental records have been updated in your portal.";
    if (isApproved) return "Your appointment is confirmed! Please arrive 10 minutes early with a valid ID.";
    return "Your request is currently being reviewed by our staff. We will notify you once confirmed.";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-inter">
      <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
        
        {/* Dynamic Header */}
        <div className={`p-10 text-white text-center transition-all duration-500 ${isDeclined ? 'bg-red-500' : isApproved ? 'bg-emerald-500' : 'bg-indigo-600'}`}>
          <h1 className="text-3xl font-black tracking-tight">Appointment Status</h1>
          <div className="mt-2 inline-block px-4 py-1 bg-white/20 rounded-full backdrop-blur-sm text-xs font-mono tracking-widest uppercase">
            REF: {id}
          </div>
        </div>

        <div className="p-8 md:p-12">
          {/* Status Progress Bar */}
          <div className="relative flex justify-between mb-16 px-4">
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
            
            {/* Step 1: Requested */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-100 ring-4 ring-white">✓</div>
              <span className="text-[10px] mt-3 font-black uppercase text-gray-400 tracking-tighter">Requested</span>
            </div>

            {/* Step 2: Approval */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 ring-4 ring-white shadow-lg ${isApproved ? 'bg-emerald-500 text-white shadow-emerald-100' : isDeclined ? 'bg-red-500 text-white shadow-red-100' : 'bg-gray-200 text-gray-400'}`}>
                {isApproved ? '✓' : isDeclined ? '✕' : '2'}
              </div>
              <span className={`text-[10px] mt-3 font-black uppercase tracking-tighter ${isApproved || isDeclined ? 'text-gray-700' : 'text-gray-400'}`}>
                {isDeclined ? 'Declined' : 'Confirmed'}
              </span>
            </div>

            {/* Step 3: Visit */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 ring-4 ring-white shadow-lg ${isComplete ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-gray-200 text-gray-400'}`}>
                {isComplete ? '✓' : '3'}
              </div>
              <span className={`text-[10px] mt-3 font-black uppercase tracking-tighter ${isComplete ? 'text-gray-700' : 'text-gray-400'}`}>Visited</span>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-gray-50/50 rounded-3xl p-8 space-y-5 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Patient</span>
              <span className="font-bold text-gray-800">{appointment.patientFullName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Service</span>
              <span className="font-bold text-gray-800">{appointment.serviceType}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Schedule</span>
              <div className="text-right">
                <p className="font-bold text-gray-800">{appointment.scheduledDate}</p>
                <p className="text-xs font-medium text-indigo-500">{appointment.scheduledTime}</p>
              </div>
            </div>
            
            {/* ENHANCED: Dynamic Clinic Message Section */}
            <div className={`mt-6 p-5 rounded-2xl border transition-colors ${isDeclined ? 'bg-red-50/50 border-red-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isDeclined ? 'bg-red-500' : 'bg-indigo-500 animate-pulse'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDeclined ? 'text-red-600' : 'text-indigo-600'}`}>
                  Clinic Update
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed font-medium italic">
                "{getClinicMessage()}"
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
             <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-600 text-sm transition-all font-bold group">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
               </svg>
               Back to Menchie's Dental Clinic
             </Link>
          </div>
        </div>
      </div>
      
      <footer className="mt-12 text-center text-gray-400 text-xs font-medium">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic • Secured Patient Portal
      </footer>
    </div>
  );
};

export default TrackStatus;