import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase-config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const TrackStatus = () => {
  const { id } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We use onSnapshot so the page updates automatically 
    // if the admin approves the appointment while the user is watching!
    const docRef = doc(db, "appointments", id);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppointment(docSnap.data());
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
      <p className="text-gray-600 mt-2">We couldn't find an appointment with that ID.</p>
      <Link to="/" className="mt-6 text-indigo-600 font-bold underline">Return Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold">Appointment Status</h1>
          <p className="opacity-90 mt-2">ID: {id}</p>
        </div>

        <div className="p-8">
          {/* Status Progress Bar */}
          <div className="relative flex justify-between mb-12">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
            
            {/* Step 1: Requested */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">1</div>
              <span className="text-xs mt-2 font-bold text-gray-600">Requested</span>
            </div>

            {/* Step 2: Approval (Changes color based on status) */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${appointment.status?.isPending === 'Approved' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
              <span className="text-xs mt-2 font-bold text-gray-600">Approved</span>
            </div>

            {/* Step 3: Visit */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">3</div>
              <span className="text-xs mt-2 font-bold text-gray-600">Completed</span>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Patient</span>
              <span className="font-bold">{appointment.patientFullName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Service</span>
              <span className="font-bold">{appointment.serviceType}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Date & Time</span>
              <span className="font-bold">{appointment.scheduledDate} at {appointment.scheduledTime}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-gray-500">Current Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${appointment.status?.isPending === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {appointment.status?.isPending || "Pending"}
              </span>
            </div>
          </div>

          <div className="mt-8 text-center">
             <Link to="/" className="text-gray-400 hover:text-indigo-600 text-sm transition">
               ← Back to Home
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackStatus;