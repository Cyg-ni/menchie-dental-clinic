import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase-config';
import { doc, onSnapshot } from 'firebase/firestore';

const TrackStatus = () => {
  const { id } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We use onSnapshot for real-time updates
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

  // Status mapping for the progress bar
  const isApproved = appointment.status?.isScheduled === "Scheduled";
  const isComplete = appointment.status?.isComplete === "Complete";
  const isDeclined = appointment.status?.isScheduled === "Declined";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`p-8 text-white text-center transition-colors ${isDeclined ? 'bg-red-500' : 'bg-indigo-600'}`}>
          <h1 className="text-3xl font-bold">Appointment Status</h1>
          <p className="opacity-90 mt-2 font-mono">Ref: {id}</p>
        </div>

        <div className="p-8">
          {/* Status Progress Bar */}
          <div className="relative flex justify-between mb-12">
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
            
            {/* Step 1: Requested */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">✓</div>
              <span className="text-xs mt-2 font-bold text-gray-600">Requested</span>
            </div>

            {/* Step 2: Approval */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${isApproved ? 'bg-green-500 text-white' : isDeclined ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {isApproved ? '✓' : isDeclined ? '✕' : '2'}
              </div>
              <span className="text-xs mt-2 font-bold text-gray-600">{isDeclined ? 'Declined' : 'Confirmed'}</span>
            </div>

            {/* Step 3: Visit */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${isComplete ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {isComplete ? '✓' : '3'}
              </div>
              <span className="text-xs mt-2 font-bold text-gray-600">Visited</span>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Patient</span>
              <span className="font-bold text-gray-800">{appointment.patientFullName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Service</span>
              <span className="font-bold text-gray-800">{appointment.serviceType}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Schedule</span>
              <span className="font-bold text-gray-800">{appointment.scheduledDate} @ {appointment.scheduledTime}</span>
            </div>
            
            {/* Admin Note / Message */}
            <div className="pt-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Clinic Message</span>
              <p className="text-gray-700 mt-1 italic">
                "{appointment.status?.trackingNote || "Your request is currently being reviewed by our staff."}"
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
             <Link to="/" className="text-gray-400 hover:text-indigo-600 text-sm transition font-medium">
               ← Back to Menchie's Dental Clinic
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackStatus;