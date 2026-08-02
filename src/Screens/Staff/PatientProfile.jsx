import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
// 👇️ FIREBASE IMPORTS
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'; 
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { logActivity, getCurrentUserId } from "../../utils/activityLogger";

// 👇️ COMPONENT IMPORTS
import Odontogram from "./Odontogram.jsx";
import TeethModelViewer from "../../components/TeethModelViewer.jsx"; 

// 👇️ STYLES
import "./Layout.css";
import "./AddingPatientModal.css";
import "./Odontogram.css";

const EMPTY_PROFILE_IMAGE = "/empty%20profile.jpg";

const appointmentsCollectionRef = collection(db, "appointments");

// --- ICON COMPONENT ---
const Icon = ({ name }) => {
  switch (name) {
    case "dashboard":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M3 12h7V3H3v9zm11 9h7v-6h-7v6zM3 21h7v-6H3v6zm11-9h7V3h-7v9z"/></svg>;
    case "appointments":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "patients":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M17 11a4 4 0 1 0-4-4"/><path d="M3 21a6 6 0 0 1 12 0"/><path d="M15 21a6 6 0 0 1 6-6"/></svg>;
    case "settings":
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .68.39 1.29 1 1.51.59.23 1.27.1 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.43.55-.56 1.23-.33 1.82.22.61.83 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.68 0-1.29.39-1.51 1z"/></svg>;
    default:
      return null;
  }
};

const TABS = [
  { key: "info", label: "Patient Information" },
  { key: "history", label: "Appointment History" },
  { key: "next", label: "Next Treatment" },
  { key: "medical", label: "Medical Record" }
];

// --- HELPER FUNCTIONS ---
const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00'); 
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatAppointmentTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m); 
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const buildPatientTreatmentArchiveId = (patientId, treatment, index) => {
  const baseKey = `${treatment?.date || 'unknown-date'}-${treatment?.procedure || 'unknown-procedure'}-${index}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return `patient_treatment_${patientId}_${baseKey}`;
};

const archiveDeletedPatientTreatment = async ({ patientId, patientName, treatment, index }) => {
  const archiveId = buildPatientTreatmentArchiveId(patientId, treatment, index);
  await setDoc(doc(db, 'deleted_records', archiveId), {
    sourceCollection: 'patient_treatments',
    originalId: archiveId,
    parentId: patientId,
    parentCollection: 'patients',
    subcollection: 'treatments',
    data: {
      treatment,
      patientId,
      patientName,
      originalIndex: index,
    },
    deletedAt: new Date().toISOString(),
    archivedAt: new Date().toISOString(),
  });
};

// --- Render Appointment History Component ---
const RenderAppointmentHistory = ({ history }) => {
    if (!history || history.length === 0) {
        return <div style={{ color: '#999', padding: 24 }}>No previous appointments found for this patient.</div>;
    }
    
    return (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {history.map((appt) => {
                // Determine if the appointment was finished via the dashboard "Release" button
                const isFinished = appt.status?.isComplete === 'Complete';
                const displayStatus = isFinished ? 'Complete' : (appt.status?.isScheduled || 'Pending');
                const statusColor = isFinished ? '#21965a' : '#d96a2f';

                return (
                    <div key={appt.id} style={{ border: '1px solid #e1e1e1', borderRadius: 8, padding: 15, background: '#fcfcfc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontWeight: 600, color: '#223245' }}>{appt.serviceType || 'Service N/A'}</span>
                            <span style={{ fontSize: 12, color: '#555' }}>
                                {formatAppointmentDate(appt.scheduledDate)} at {formatAppointmentTime(appt.scheduledTime)}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#777' }}>
                            Status: <span style={{ fontWeight: 600, color: statusColor }}>
                                {displayStatus}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#777', marginTop: 5 }}>
                            Notes: {appt.patientNotes || 'None'}
                        </div>
                        {/* Show the actual completion time if available */}
                        {appt.completedAt && (
                            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                                Treatment ended at: {new Date(appt.completedAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- Refresh button for appointment history ---
const RefreshAppointments = ({ onRefresh, loading }) => {
  return (
    <div style={{ marginTop: 12 }}>
      <button className="btn ghost" onClick={onRefresh} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh Appointments'}
      </button>
    </div>
  );
};


// === MAIN COMPONENT ===
export default function PatientProfile() {
  
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(true);
  const [tab, setTab] = useState("medical"); 

  // Data States
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); 
  const [appointmentHistory, setAppointmentHistory] = useState([]);

  // Odontogram / Treatment States
  const [treatTeeth, setTreatTeeth] = useState([]);
  const [currentTool, setCurrentTool] = useState('treat'); 
  const [toothStates, setToothStates] = useState({
    // Add test cavity teeth for demonstration
    22: 'cavity',
    23: 'cavity',
    24: 'cavity',
    25: 'cavity',
    26: 'cavity'
  }); 

  const [form, setForm] = useState({
    condition: '',
    procedure: '',
    notes: '',
    done: false,
    isModelOpen: false, 
    modelToothStates: {}
  });
  const [submitMsg, setSubmitMsg] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState(null); 

  // --- EFFECT: Reset state on Tab/ID change ---
  useEffect(() => {
    setTreatTeeth([]);
    setForm(f => ({ 
        condition: '', 
        procedure: '', 
        notes: '', 
        done: false,
        isModelOpen: f.isModelOpen, 
        modelToothStates: f.modelToothStates
    })); 
    setSubmitMsg("");
    if (tab === 'next') setCurrentTool('treat'); 
  }, [tab, id]);

  
  // --- EFFECT: Sync Tooth States from Patient Data ---
  useEffect(() => {
      if (patient) {
          const newState = {};
          
          if (patient.currentToothState) {
              Object.assign(newState, patient.currentToothState);
          }
          
          (patient.treatments || []).forEach(t => {
              if (t.done) {
                  t.teeth.forEach(tooth => {
                      if (newState[tooth] !== 'missing') {
                          newState[tooth] = 'treated'; 
                      }
                  });
              }
          });
          
          setToothStates(newState);
      }
  }, [patient]);


  // --- DATA FETCHING ---
  const getPatient = useCallback(async (patientId) => {
    if (!patientId) { setLoading(false); return; }
    if (!isUpdatingStatus) setLoading(true); 
    
    try {
        const docRef = doc(db, "patients", patientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setPatient({ id: docSnap.id, ...docSnap.data(), name: docSnap.data().name || `Patient ${docSnap.id.substring(0, 5)}` }); 
        } else {
            setPatient(null); 
        }
    } catch (error) {
        console.error("Error fetching patient:", error);
        setPatient(null);
    } finally {
        if (!isUpdatingStatus) setLoading(false);
    }
  }, [isUpdatingStatus]);


  const getAppointmentHistory = useCallback(async (patientId) => {
    if (!patientId) return;
    const patientIdQueryValue = `/patients/${patientId}`;
    try {
      // 1) Primary: appointments tied to the patientId
      const qById = query(
        appointmentsCollectionRef,
        where("patientId", "in", [patientId, patientIdQueryValue])
      );
      const snapById = await getDocs(qById);

      // 2) Secondary: try to match by the patient's email (if available)
      let emailMatches = [];
      try {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        const patientData = patientDoc.exists() ? patientDoc.data() : null;
        const patientEmail = patientData?.email || patientData?.contactEmail || patientData?.contactInfo || patientData?.contact?.email || null;
        if (patientEmail) {
          // Try several common email field names on the appointment record
          const emailFields = ['email', 'patientEmail', 'contactEmail', 'contact.email'];
          for (const field of emailFields) {
            try {
              const qEmail = query(
                appointmentsCollectionRef,
                where(field, '==', patientEmail)
              );
              const snapEmail = await getDocs(qEmail);
              emailMatches = emailMatches.concat(snapEmail.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
              // ignore field-not-found or other query errors and continue
              // (Firestore may error if field is not indexed)
              console.debug('email query failed for field', field, e.message || e);
            }
          }
        }
      } catch (e) {
        console.debug('Failed to read patient email', e.message || e);
      }

      // Merge results (dedupe by id)
      const map = new Map();
      snapById.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
      emailMatches.forEach(a => map.set(a.id, a));

      const merged = Array.from(map.values());

      // Sort by scheduledDate desc, then scheduledTime desc
      merged.sort((a, b) => {
        const da = a.scheduledDate || '';
        const db = b.scheduledDate || '';
        if (da > db) return -1;
        if (da < db) return 1;
        const ta = a.scheduledTime || '00:00';
        const tb = b.scheduledTime || '00:00';
        if (ta > tb) return -1;
        if (ta < tb) return 1;
        return 0;
      });

      // If nothing found yet, do a broader fallback: scan recent appointments and match email anywhere in the document
      if (merged.length === 0) {
        try {
          const patientDoc = await getDoc(doc(db, 'patients', patientId));
          const patientData = patientDoc.exists() ? patientDoc.data() : null;
          const patientEmail = patientData?.email || patientData?.contactEmail || patientData?.contactInfo || patientData?.contact?.email || null;
          if (patientEmail) {
            const allRecentQuery = query(appointmentsCollectionRef, orderBy('updatedAt', 'desc'));
            const recentSnap = await getDocs(allRecentQuery);
            const lowerEmail = patientEmail.toLowerCase();
            const matched = [];
            recentSnap.docs.slice(0, 500).forEach(d => {
              try {
                const raw = JSON.stringify(d.data()).toLowerCase();
                if (raw.includes(lowerEmail)) matched.push({ id: d.id, ...d.data() });
              } catch (e) { /* ignore stringify errors */ }
            });
            // Merge these matches too
            matched.forEach(a => map.set(a.id, a));
          }
        } catch (e) {
          console.debug('fallback scan failed', e.message || e);
        }
      }

      setAppointmentHistory(Array.from(map.values()).sort((a,b)=>{
        const da = a.scheduledDate || '';
        const db = b.scheduledDate || '';
        if (da > db) return -1;
        if (da < db) return 1;
        const ta = a.scheduledTime || '00:00';
        const tb = b.scheduledTime || '00:00';
        if (ta > tb) return -1;
        if (ta < tb) return 1;
        return 0;
      }));
    } catch (error) {
      console.error("Error fetching appointment history:", error);
      setAppointmentHistory([]);
    }
  }, []);

  useEffect(() => {
    const patientId = id; 
    getPatient(patientId);
    getAppointmentHistory(patientId);
  }, [id, getPatient, getAppointmentHistory]); 

  
  // --- HANDLERS ---

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setCurrentTool('treat'); 
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  
  // Handle toggling "Mark Missing" (Removed Issue logic)
  const handlePermanentToothStateChange = async (toothId, tool) => {
      let newState;
      const currentState = toothStates[toothId];
      
      if (tool === 'missing') {
          newState = currentState === 'missing' ? 'healthy' : 'missing';
      } else {
          return; 
      }

      const updatedStates = { ...toothStates };
      if (newState === 'healthy') {
          delete updatedStates[toothId];
          setTreatTeeth(prev => prev.filter(t => t !== toothId)); 
      } else {
          updatedStates[toothId] = newState;
      }
      setToothStates(updatedStates);

      if (newState === 'missing') {
          setTreatTeeth(prev => {
              if (!prev.includes(toothId)) return [...prev, toothId];
              return prev;
          });
      }

      try {
          const patientDocRef = doc(db, "patients", id); 
          await updateDoc(patientDocRef, {
              currentToothState: updatedStates,
              updated: new Date().toISOString().split('T')[0]
          });

          setPatient(prev => ({
              ...prev,
              currentToothState: updatedStates
          }));

      } catch (error) {
          console.error("Error updating tooth state:", error);
          alert("Failed to update tooth state.");
      }
      
      setCurrentTool(tool); 
  };

  const handleStatusToggle = async (treatmentIndex, currentStatus) => {
      if (isUpdatingStatus || !patient || !patient.treatments) return;
      setIsUpdatingStatus(true);
      
      try {
          const updatedTreatments = [...patient.treatments];
          updatedTreatments[treatmentIndex].done = !currentStatus;

          const patientDocRef = doc(db, "patients", id); 
          await updateDoc(patientDocRef, {
              treatments: updatedTreatments,
              updated: new Date().toISOString().split('T')[0] 
          });

          if (selectedTreatment === patient.treatments[treatmentIndex]) {
              setSelectedTreatment(updatedTreatments[treatmentIndex]);
          }

          setPatient(p => ({ ...p, treatments: updatedTreatments }));

      } catch (error) {
          console.error("Error toggling status:", error);
          alert("Failed to update status.");
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  const handleDeleteTreatment = async (index, treatment) => {
      if (!window.confirm("Are you sure you want to delete this treatment record?")) return;

      if (isUpdatingStatus || !patient || !patient.treatments) return;
      setIsUpdatingStatus(true);

      try {
          const updatedTreatments = [...patient.treatments];
          updatedTreatments.splice(index, 1); 

          await archiveDeletedPatientTreatment({
            patientId: id,
            patientName: patient?.name || 'Unknown Patient',
            treatment,
            index,
          });

          const patientDocRef = doc(db, "patients", id);
          await updateDoc(patientDocRef, {
              treatments: updatedTreatments,
              updated: new Date().toISOString().split('T')[0]
          });

          const userId = getCurrentUserId();
          await logActivity(userId, 'Deleted a treatment record', {
              patientId: id,
              patientName: patient?.name || 'Unknown Patient',
              treatmentDate: treatment?.date || '',
              treatmentProcedure: treatment?.procedure || '',
              treatmentCondition: treatment?.condition || '',
              teeth: treatment?.teeth || [],
          });

          setPatient(p => ({ ...p, treatments: updatedTreatments }));
          
          if (selectedTreatment === treatment) {
              setSelectedTreatment(null);
          }

      } catch (error) {
          console.error("Error deleting treatment:", error);
          alert("Failed to delete treatment.");
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  const handleTreatmentSubmit = async e => {
    e.preventDefault();
    
    if (currentTool !== 'treat' || treatTeeth.length === 0 || !form.condition || !form.procedure) { 
        if (currentTool !== 'treat') {
            setSubmitMsg("Please switch to 'Select for Treatment' mode.");
        } else {
            setSubmitMsg("Fill required fields and select a tooth.");
        }
        return;
    }
    
    // Collect all teeth marked as missing in the current session (from toothStates with 'missing' state)
    const missingTeeth = Object.entries(toothStates)
      .filter(([tooth, state]) => state === 'missing')
      .map(([tooth]) => tooth);
    
    // Combine missing teeth + selected treatment teeth (remove duplicates)
    const allTeeth = Array.from(new Set([...missingTeeth, ...treatTeeth]));
    
    const newTreat = {
      condition: form.condition,
      procedure: form.procedure,
      notes: form.notes,
      done: form.done,
      teeth: allTeeth,
      date: new Date().toISOString().split('T')[0],
    };

    try {
        const updatedTreatments = [newTreat, ...(patient.treatments || [])];
        const patientDocRef = doc(db, "patients", id); 
        
        const updatedToothStates = { ...patient.currentToothState || {} };
        if (newTreat.done) {
            const proc = (newTreat.procedure || '').toLowerCase();
            const isRemoval = proc.includes('remove') || proc.includes('remov') || proc.includes('extract');

            newTreat.teeth.forEach(tooth => {
                // Preserve 'missing' state for teeth that were already marked as missing
                const currentState = toothStates[tooth];
                if (currentState === 'missing') {
                    updatedToothStates[tooth] = 'missing';
                } else {
                    updatedToothStates[tooth] = isRemoval ? 'missing' : 'treated';
                }
            });
        }
        
        await updateDoc(patientDocRef, {
            treatments: updatedTreatments,
            currentToothState: updatedToothStates,
            updated: new Date().toISOString().split('T')[0] 
        });

        const userId = getCurrentUserId();
        await logActivity(userId, 'Created a treatment record', {
            patientId: id,
            patientName: patient?.name || 'Unknown Patient',
            treatmentDate: newTreat.date,
            treatmentProcedure: newTreat.procedure,
            treatmentCondition: newTreat.condition,
            teeth: newTreat.teeth,
            done: newTreat.done,
        });

        setPatient(p => ({ ...p, treatments: updatedTreatments, currentToothState: updatedToothStates }));
        setSubmitMsg("Treatment added!");
        setTreatTeeth([]);
        setForm({ condition: '', procedure: '', notes: '', done: false }); 
        setCurrentTool('treat'); 
    } catch (error) {
        console.error("Error submitting treatment:", error);
        setSubmitMsg("Failed to add treatment.");
    }

    setTimeout(() => setSubmitMsg(''), 1400);
  };


  if (loading) return <div style={{ padding: 48 }}>Loading Patient...</div>;
  if (!patient) return <div style={{ padding: 48 }}>Patient Not Found</div>;

  // --- BADGE STYLE HELPER ---
  const getToothBadgeStyle = (toothNum) => {
    const currentState = patient.currentToothState ? patient.currentToothState[toothNum] : null;

    if (currentState === 'missing') {
        return { background: '#f5f5f5', color: '#666', border: '1px solid #ccc' }; // Grey
    }
    if (currentState === 'treated') {
        return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #388e3c' }; // Green
    }
    // Default Blue
    return { background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' }; 
  };

  const RenderTreatmentsTimeline = () => (
    <div style={{ marginTop: 12 }}>
      {(patient.treatments && patient.treatments.length > 0) ? (
        patient.treatments.map((t, i) => {
          const statusText = t.done ? 'Done' : 'Ongoing';
          const statusColor = t.done ? '#25994e' : '#d96a2f';
          
          return (
            <div 
              onClick={() => setSelectedTreatment(t)} 
              style={{ 
                background: selectedTreatment === t ? '#e3f2fd' : '#fff', 
                borderRadius: 8, 
                boxShadow:'0 1px 9px #ebedf1', 
                padding: 20, 
                marginBottom: 18, 
                display:'flex', 
                gap:18,
                cursor: 'pointer',
                border: selectedTreatment === t ? '2px solid #2452a2' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }} 
              key={i}
            >
              <div style={{ minWidth: 65, textAlign:'center', color:'#4a587d', fontWeight:700, fontSize:17, marginTop: 4 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                    {t.teeth.map(toothNum => (
                        <div 
                            key={toothNum} 
                            style={{
                                fontSize: 13, 
                                padding: '2px 6px', 
                                borderRadius: 4, 
                                ...getToothBadgeStyle(toothNum)
                            }}
                        >
                            {toothNum}
                        </div>
                    ))}
                </div>
                <span style={{fontWeight:500, color:'#888',fontSize:11, display:'block', marginTop: 4}}>
                  { t.teeth.length === 1 ? 'Tooth' : 'Teeth' }
                </span>
              </div>
              <div style={{flex:1, color: '#333'}}>
                <div style={{ display:'flex', gap:32, marginBottom:4, color: '#555' }}>
                  <span><b style={{color: '#333'}}>Date:</b> {t.date}</span>
                  <span><b style={{color: '#333'}}>Condition:</b> {t.condition}</span>
                  <span><b style={{color: '#333'}}>Treatment:</b> {t.procedure}</span>
                  
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b>Status:</b> 
                    <button 
                      onClick={(e) => {
                          e.stopPropagation(); 
                          const originalIndex = patient.treatments.findIndex(item => item === t);
                          if (originalIndex !== -1) handleStatusToggle(originalIndex, t.done); 
                      }}
                      disabled={isUpdatingStatus}
                      style={{
                          background: statusColor,
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 12,
                          opacity: isUpdatingStatus ? 0.6 : 1
                      }}
                    >
                      {statusText}
                    </button>
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            const originalIndex = patient.treatments.findIndex(item => item === t);
                            if (originalIndex !== -1) handleDeleteTreatment(originalIndex, t);
                        }}
                        disabled={isUpdatingStatus}
                        title="Delete Record"
                        style={{
                            background: '#fff',
                            border: '1px solid #ffcccc',
                            color: '#d32f2f',
                            padding: '3px 8px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                        }}
                    >
                        ✕
                    </button>
                  </span>
                </div>
                <div style={{fontSize:14, margin: '8px 0', color: '#555'}}>{t.notes}</div>
              </div>
            </div>
          );
        })
        ) : (
          <div style={{ color: '#999', marginTop: 18 }}>No treatments yet.</div>
        )
      }
    </div>
  );

  return (
    <div className="dashboard">
      <header className="topbar">
      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}> ≡ </button>
      <div className="brand-left"> <div className="brand-logo" /> <div className="brand-name">Menchie's Dental Clinic</div> </div>
      <div className="user">
          <div className="avatar" style={{ backgroundImage: `url(${currentUser?.profilePictureUrl || EMPTY_PROFILE_IMAGE})` }} />
          <div className="user-meta">
            <div className="user-name">{currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username : "Loading..."}</div>
            <div className="user-role">{currentUser?.role ? currentUser.role.replace('_', ' ').toUpperCase() : "..."}</div>
          </div>
      </div>
      </header>

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <nav className="sidebar-nav">
          <button className={`nav-item ${location.pathname.startsWith("/dashboard") ? "active" : ""}`} onClick={() => navigate("/dashboard")}> <Icon name="dashboard" /> </button>
          <button className={`nav-item ${location.pathname.startsWith("/schedule") ? "active" : ""}`} onClick={() => navigate("/schedule")}> <Icon name="appointments" /> </button>
          <button className={`nav-item ${location.pathname.startsWith("/patient-list") ? "active" : ""}`} onClick={() => navigate("/patient-list")}> <Icon name="patients" /> </button>
          <button className={`nav-item ${location.pathname.startsWith("/settings") ? "active" : ""}`} onClick={() => navigate("/settings")}> <Icon name="settings" /> </button>
        </nav>
      </aside>

      <main className="main">
        <div style={{ padding: 28, maxWidth: 1300, margin: 'auto' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button onClick={() => navigate("/patient-list")} className="btn-secondary" style={{ marginRight: 36 }}>⟵ Back to List</button>
          <img
            src={patient.image || EMPTY_PROFILE_IMAGE}
            alt={patient.image ? 'profile' : 'empty profile'}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: '2px solid #ebebeb',
              objectFit: 'cover',
              backgroundColor: '#f5f5f5',
              display: 'block'
            }}
          />
          <div> <h2 style={{ margin: 0, color: '#333' }}>{patient.name || 'N/A'}</h2> <div style={{ color: '#555', marginTop: 4 }}>{patient.contactInfo || patient.phone_num}</div> </div>
          <div style={{ flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 36, borderBottom: '2px solid #eee' }}>
          {TABS.map(({ key, label }) => (
            <button key={key} className="link-btn" onClick={() => setTab(key)} style={{ border: 0, background: 'none', color: tab === key ? '#2452a2' : '#505c6b', fontWeight: tab === key ? 700 : 500, fontSize: 16, padding: '10px 18px 8px 18px', borderBottom: tab === key ? '3px solid #2452a2' : '3px solid transparent', transition: 'border-bottom .15s' }}> {label} </button>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
        
        {/* --- NEXT TREATMENT TAB --- */}
        {tab === "next" && (
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 24px #eee", padding: 22, minWidth: 340 }}>
              <div style={{ fontWeight: 700, color: '#223245', marginBottom: 10, fontSize: 18 }}>
                  Odontogram (Select Teeth to Treat)
              </div>
              <div style={{ marginBottom: 15, display: 'flex', gap: 10, fontSize: 13, justifyContent: 'space-around' }}>
                  <button type="button" onClick={() => setCurrentTool('missing')} style={{ background: currentTool === 'missing' ? '#e3f2fd' : '#fff', border: currentTool === 'missing' ? '1px solid #2452a2' : '1px solid #ddd', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 600, color: '#333' }}> Mark Missing </button>
                  <button type="button" onClick={() => setCurrentTool('treat')} style={{ background: currentTool === 'treat' ? '#2452a2' : '#f0f0f0', border: '1px solid #ddd', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', color: currentTool === 'treat' ? 'white' : '#333', fontWeight: 600 }}> Select for Treatment </button>
              </div>
              <Odontogram selectedTeeth={treatTeeth} onSelectionChange={setTreatTeeth} toothStates={toothStates} onStateChange={handlePermanentToothStateChange} currentTool={currentTool} selectable={currentTool === 'treat'} treatmentType={form.procedure} defaultCondition={form.condition} />
            </div>
            
            <form style={{ flex: 1, background: '#f8f9fa', borderRadius: 8, minHeight: 280, padding: 20 }} onSubmit={handleTreatmentSubmit}>
              <div className="form-group">
                <label htmlFor="condition" style={{color: '#333'}}>Condition <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                <select id="condition" name="condition" value={form.condition} onChange={handleFormChange} onFocus={() => setCurrentTool('treat')} required >
                    <option value="">Select a condition</option> <option value="tooth decay">Tooth Decay</option> <option value="tooth cavity">Tooth Cavity</option> <option value="stained teeth">Stained Teeth</option> <option value="crooked teeth">Crooked Teeth</option> <option value="corroded teeth">Corroded Teeth</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="procedure" style={{color: '#333'}}>Treatment <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                <select id="procedure" name="procedure" value={form.procedure} onChange={handleFormChange} onFocus={() => setCurrentTool('treat')} required >
                    <option value="">Select Treatment</option> 
                    <option value="tooth cleaning">Tooth Cleaning</option> 
                    <option value="tooth removal">Tooth Removal</option> 
                    <option value="teeth whitening">Teeth Whitening</option>
                    <option value="Apply dental braces">Apply dental braces</option>
                    <option value="Apply Retainer">Apply Retainer</option>
                    <option value="Dental Filling">Dental Filling</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="notes" style={{color: '#333'}}>Treatment Notes</label>
                <textarea id="notes" name="notes" value={form.notes} onChange={handleFormChange} onFocus={() => setCurrentTool('treat')} style={{ minHeight: 56 }} />  
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label" style={{color: '#333'}}> <input type="checkbox" name="done" checked={form.done} onChange={handleFormChange} /> Treatment Done </label>
              </div>
              {submitMsg && <div style={{fontWeight:600, color: submitMsg.includes('Fill') ? '#c23c33':'#21965a', marginTop:7}}>{submitMsg}</div>}
              <div className="form-actions" style={{marginTop:16}}> <button type="submit" className="btn-primary" disabled={currentTool !== 'treat'}>Save Treatment Note</button> </div>
            </form>
          </div>
        )}

        {/* --- MEDICAL RECORD TAB --- */}
        {tab === "medical" && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {(() => {
              let shadedStatus = {};
              let sectionTitle = "Odontogram (Permanent Record)";
                const selectedTreatmentCondition = selectedTreatment?.condition || '';
                const selectedTreatmentProcedure = selectedTreatment?.procedure || selectedTreatment?.treatment || '';

              // ✨ FIX: Context-Aware Odontogram
              // If a specific past treatment is selected, show details for THAT treatment only.
              if (selectedTreatment) {
                  sectionTitle = "Odontogram (Treatment Detail)";
                  const cond = selectedTreatmentCondition;
                  const permanentState = patient.currentToothState || {};
                  
                  // When viewing a timeline record, show the condition stored in that record
                  // for the selected teeth so historical values are not overridden by current state.
                  selectedTreatment.teeth.forEach(t => {
                    const permanentToothState = (permanentState[t] || '').toString().toLowerCase().trim();
                    // Preserve permanent missing state so missing teeth stay hidden in 3D.
                    shadedStatus[t] = permanentToothState === 'missing' ? 'missing' : (cond || 'healthy');
                  });
              } else {
                  // Default: Show the current permanent state (Global record)
                  const permanentState = patient.currentToothState || {};
                  Object.entries(permanentState).forEach(([tooth, status]) => {
                      if (status === 'missing' || status === 'treated') {
                          shadedStatus[tooth] = status;
                      }
                  });
              }
              
              const timelineSelectedTeeth = selectedTreatment?.teeth || [];
              
                  return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, background: "#fff", borderRadius: 10, boxShadow: "0 2px 24px #eee", padding: 22, maxWidth: '100%', overflowX: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#223245', fontSize: 18 }}> {sectionTitle} </div>
                  <Odontogram selectedTeeth={timelineSelectedTeeth} selectable={false} toothStates={shadedStatus} currentTool={'none'} onSelectionChange={()=>{}} treatmentType={selectedTreatmentProcedure || form.procedure} defaultCondition={selectedTreatmentCondition || form.condition} allowMissingPreview={Boolean(selectedTreatment)} />
                  
                  {form.isModelOpen && (
                      <div className="odontogram-modal-backdrop" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))} role="presentation">
                          <div className="odontogram-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                          <div className="odontogram-modal-header">
                            <div className="modal-title-row">
                              <h3>3D Teeth Visualization (Record)</h3>
                              <span className="modal-title-meta">
                                Teeth No.: {(timelineSelectedTeeth && timelineSelectedTeeth.length > 0) ? [...timelineSelectedTeeth].sort((a, b) => a - b).join(', ') : 'No teeth selected'} | Condition: {selectedTreatment?.condition || form.condition || 'No condition selected'} | Treatment: {selectedTreatment?.procedure || form.procedure || 'No treatment selected'}
                              </span>
                            </div>
                            <button type="button" className="modal-close-btn" aria-label="Close" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))}> × </button>
                            <div className="record-status-inline">Record Status: {selectedTreatment?.done ? 'Done' : 'Pending'}</div>
                          </div>
                              <div className="odontogram-modal-body">
                                  {/* Container required for rendering canvas */}
                                  <div style={{ width: '100%', height: '500px' }}>
                                    <TeethModelViewer selectedTeeth={timelineSelectedTeeth} toothStates={shadedStatus} defaultTreatment={selectedTreatmentProcedure || form.procedure} defaultCondition={selectedTreatmentCondition || form.condition} allowMissingPreview={Boolean(selectedTreatment)} />
                                  </div>
                              </div>
                              <div className="odontogram-modal-footer"> <button type="button" className="modal-close-secondary" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))}> Close </button> </div>
                          </div>
                      </div>
                  )}
                </div>
              );
            })()}
            <div style={{ flex: 1, background: '#f7f7f7', borderRadius: 8, minHeight: 280, padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18, color: '#333' }}>Treatment Record Timeline</div>
              {selectedTreatment && ( <button onClick={() => setSelectedTreatment(null)} style={{ background: '#f0f0f0', border: '1px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', marginBottom: 12, fontSize: 14, fontWeight: 500, color: '#333' }}> ✕ Clear Selection </button> )}
              <RenderTreatmentsTimeline />
            </div>
          </div>
        )}

        {tab === "history" && <div style={{ marginTop: 30 }}>
          <RenderAppointmentHistory history={appointmentHistory} />
          <RefreshAppointments onRefresh={() => getAppointmentHistory(id)} loading={loading} />
        </div>}
        
        {tab === "info" && (
          <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 24px #f1f1f1' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 10, color: '#333' }}>General Information</div>
              <div style={{ display: 'grid', gap: 12, color: '#555' }}> <div><b style={{color: '#333'}}>Name:</b> {patient.name || 'N/A'}</div> <div><b style={{color: '#333'}}>Contact Number:</b> {patient.phone_num || <span style={{color:'#888'}}>N/A</span>}</div> <div><b style={{color: '#333'}}>Email/Contact Info:</b> {patient.contactInfo || <span style={{color:'#888'}}>N/A</span>}</div> <div><b style={{color: '#333'}}>Address:</b> {patient.address || <span style={{color:'#888'}}>N/A</span>}</div> <div><b style={{color: '#333'}}>Gender:</b> {patient.gender || <span style={{color:'#888'}}>N/A</span>}</div> <div><b style={{color: '#333'}}>Age:</b> {patient.age || <span style={{color:'#888'}}>N/A</span>}</div> <div><b style={{color: '#333'}}>Marital Status:</b> {patient.status || <span style={{color:'#888'}}>N/A</span>}</div> <div><b style={{color: '#333'}}>Occupation:</b> {patient.occupation || <span style={{color:'#888'}}>N/A</span>}</div> <div><b style={{color: '#333'}}>Send Confirmation:</b> {patient.sendConfirmation ? "Yes" : "No"}</div> <div><b style={{color: '#333'}}>Last Updated:</b> {patient.updated || 'N/A'}</div> </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 24px #f1f1f1' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 10, color: '#333' }}>Medical Details</div>
              <div style={{ display: 'grid', gap: 12, color: '#555' }}> <div> <b style={{color: '#333'}}>Allergies:</b> { (patient.medicalHistory?.Allergies && patient.medicalHistory.Allergies.length > 0) ? <span style={{color: '#d9534f', fontWeight: 600}}>{patient.medicalHistory.Allergies.join(', ')}</span> : <span style={{color:'#888'}}>None</span> } </div> <div> <b style={{color: '#333'}}>Condition Notes:</b> {patient.medicalHistory?.conditionNotes || <span style={{color:'#888'}}>N/A</span>} </div> <div> <b style={{color: '#333'}}>Current Meds:</b> { (patient.medicalHistory?.currentMedications && patient.medicalHistory.currentMedications.length > 0) ? patient.medicalHistory.currentMedications.join(', ') : <span style={{color:'#888'}}>N/A</span> } </div> <div> <b style={{color: '#333'}}>Is Pregnant:</b> {patient.isPregnant ? <span style={{color: '#d9534f', fontWeight: 600}}>Yes</span> : "No"} </div> <div> <b style={{color: '#333'}}>Smoker:</b> {patient.smokingStatus ? <span style={{color: '#d9534f', fontWeight: 600}}>Yes</span> : "No"} </div> </div>
            </div>
          </div>
        )}
        </div>
        </div>
      </main>
    </div>
  );
}