import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import TeethModelViewer from '../components/TeethModelViewer';

const PatientPortal = () => {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [toothConditions, setToothConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- 3D MODEL LOGIC STATES ---
  const [toothStates, setToothStates] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewMode, setViewMode] = useState('status');
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPatientData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchPatientData = async (uid) => {
    try {
      const profileDoc = await getDoc(doc(db, "patients", uid));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        setProfile(data);

        const rawTreatments = data.treatments || [];
        const statesObj = {};
        
        const formattedRecords = rawTreatments.map((record, index) => {
          // Logic: Map conditions to specific tooth numbers for the 3D model
          if (record.teeth) {
            record.teeth.forEach(tNum => {
              statesObj[tNum] = record.condition?.toLowerCase() || 'healthy';
            });
          }
          return {
            id: index,
            toothNumbers: record.teeth || [],
            date: record.date || "N/A",
            condition: record.condition || "--",
            procedure: record.procedure || "--",
            treatment: record.procedure || "--", // Add alias for component compatibility
            done: record.done
          };
        });

        setToothStates(statesObj);
        setToothConditions(formattedRecords.sort((a, b) => new Date(b.date) - new Date(a.date)));
        
        // Fetch appointments...
        if (data.contactInfo) {
          const appQuery = query(collection(db, "appointments"), where("patientEmail", "==", data.contactInfo), orderBy("scheduledDate", "desc"));
          const appSnapshot = await getDocs(appQuery);
          setAppointments(appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- ACTUAL 3D RENDERER LOGIC ---
  // (Replaced by TeethModelViewer component)


  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-inter">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center print:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
            Print Record
          </button>
        </div>

        <header className="border-b border-gray-100 pb-6">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Patient Dashboard</h1>
          <p className="text-gray-500 font-medium">Welcome back, <span className="text-indigo-600 font-bold">{profile?.firstName || 'Patient'}</span></p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PERSERVED DESIGN: Medical Profile Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Details</h2>
              <div className="space-y-3 text-sm border-b border-gray-50 pb-6">
                <p className="flex justify-between"><span className="text-gray-400 font-medium">Full Name:</span> <span className="font-bold text-gray-700">{profile?.firstName} {profile?.lastName}</span></p>
                <p className="flex justify-between"><span className="text-gray-400 font-medium">Age/Gender:</span> <span className="font-bold text-gray-700">{profile?.age} • {profile?.gender}</span></p>
              </div>

              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-6 mb-4">Medical History</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-gray-400 font-medium block mb-1">Allergies:</span>
                  <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs ${profile?.medicalHistory?.Allergies?.conditionNotes ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {profile?.medicalHistory?.Allergies?.conditionNotes || 'None Reported'}
                  </span>
                </div>
                <div className="flex gap-4 pt-2">
                   <div className={`flex-1 text-center p-3 rounded-2xl border ${profile?.isSmoking ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-gray-50 border-gray-100'}`}>
                      <p className="text-[10px] uppercase font-black">Smoker</p>
                      <p className="font-bold">{profile?.isSmoking ? 'Yes' : 'No'}</p>
                   </div>
                   <div className={`flex-1 text-center p-3 rounded-2xl border ${profile?.isPregnant ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-100'}`}>
                      <p className="text-[10px] uppercase font-black">Pregnant</p>
                      <p className="font-bold">{profile?.isPregnant ? 'Yes' : 'No'}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            {/* 3D Model Section */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <h2 className="text-xl font-black text-gray-800">3D Dental Model</h2>
                
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                  {['status', 'condition', 'treatment'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        viewMode === mode 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-[400px] w-full rounded-[1.5rem] bg-gray-50 border border-gray-100 relative overflow-hidden">
                <TeethModelViewer 
                  toothStates={toothStates}
                  selectedTeeth={selectedRecord ? selectedRecord.toothNumbers : []}
                  selectedRecord={selectedRecord}
                  timelineRecords={toothConditions}
                  viewMode={viewMode}
                />
              </div>
            </div>

            {/* Treatment Records Section */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <h2 className="text-xl font-black text-gray-800 mb-6">Treatment Records</h2>
              <div className="space-y-6">
                {toothConditions.map((record) => (
                  <div key={record.id} onClick={() => setSelectedRecord(record)} className={`p-6 border rounded-3xl transition-all cursor-pointer flex flex-col md:flex-row items-center gap-6 ${selectedRecord?.id === record.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-indigo-100 text-lg">
                      {record.toothNumbers.join(", ")}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 text-sm">
                      <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">Date</p><p className="font-bold text-gray-700">{record.date}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">Condition</p><p className="font-bold text-gray-700 capitalize">{record.condition}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">Procedure</p><p className="font-bold text-gray-700 capitalize">{record.procedure}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientPortal;