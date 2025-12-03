import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
// 👇️ FIREBASE IMPORTS
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'; 

// 👇️ COMPONENT IMPORTS
import Odontogram from "./Odontogram.jsx";
import TeethModelViewer from "../../components/TeethModelViewer.jsx"; 

// 👇️ STYLES
import "./Layout.css";
import "./AddingPatientModal.css";
import "./Odontogram.css";

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

const imagePlaceholder = (
  <div className="image-placeholder" style={{ width: 76, height: 76 }}>
    <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2"/>
      <path d="M7 18l3-3"/>
      <path d="M14 18l3-3"/>
    </svg>
  </div>
);

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

const RenderAppointmentHistory = ({ history }) => {
    if (!history || history.length === 0) {
        return <div style={{ color: '#999', padding: 24 }}>No previous appointments found for this patient.</div>;
    }
    
    return (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {history.map((appt) => (
                <div key={appt.id} style={{ border: '1px solid #e1e1e1', borderRadius: 8, padding: 15, background: '#fcfcfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontWeight: 600, color: '#223245' }}>{appt.serviceType || 'Service N/A'}</span>
                        <span style={{ fontSize: 12, color: '#555' }}>
                            {formatAppointmentDate(appt.scheduledDate)} at {formatAppointmentTime(appt.scheduledTime)}
                        </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#777' }}>
                        Status: <span style={{ fontWeight: 600, color: appt.status?.isComplete === 'Complete' ? '#21965a' : '#d96a2f' }}>
                            {appt.status?.isComplete || appt.status?.isScheduled}
                        </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#777', marginTop: 5 }}>
                        Notes: {appt.patientNotes || 'None'}
                    </div>
                </div>
            ))}
        </div>
    );
};


// === MAIN COMPONENT ===
export default function PatientProfile() {
  
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [toothStates, setToothStates] = useState({}); 

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
        const q = query(
            appointmentsCollectionRef,
            where("patientId", "in", [patientId, patientIdQueryValue]), 
            orderBy("scheduledDate", "desc") 
        );
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAppointmentHistory(history);
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
      } else {
          updatedStates[toothId] = newState;
      }
      setToothStates(updatedStates);

      // Auto-select if missing (so it can be saved to timeline)
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

          const patientDocRef = doc(db, "patients", id);
          await updateDoc(patientDocRef, {
              treatments: updatedTreatments,
              updated: new Date().toISOString().split('T')[0]
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
    
    const newTreat = {
      condition: form.condition,
      procedure: form.procedure,
      notes: form.notes,
      done: form.done,
      teeth: [...treatTeeth],
      date: new Date().toISOString().split('T')[0],
    };

    try {
        const updatedTreatments = [newTreat, ...(patient.treatments || [])];
        const patientDocRef = doc(db, "patients", id); 
        
        const updatedToothStates = { ...patient.currentToothState || {} };
        if (newTreat.done) {
            newTreat.teeth.forEach(tooth => {
                updatedToothStates[tooth] = 'treated';
            });
        }
        
        await updateDoc(patientDocRef, {
            treatments: updatedTreatments,
            currentToothState: updatedToothStates,
            updated: new Date().toISOString().split('T')[0] 
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
              <div style={{flex:1}}>
                <div style={{ display:'flex', gap:32, marginBottom:4 }}>
                  <span><b>Date:</b> {t.date}</span>
                  <span><b>Condition:</b> {t.condition}</span>
                  <span><b>Treatment:</b> {t.procedure}</span>
                  
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
                <div style={{fontSize:14, margin: '8px 0'}}>{t.notes}</div>
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
      <div className="brand-left"> <div className="brand-logo" /> <div className="brand-name">Dr. Menchie Amor Dangla Dental Clinic</div> </div>
      <div className="user"> <div className="avatar" /> <div className="user-meta"> <div className="user-name">Juana Cruz</div> <div className="user-role">Chief Dentist</div> </div> </div>
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
          {patient.image ? ( <img src={patient.image} alt="profile" style={{ width: 76, height: 76, borderRadius: 50, border: '2px solid #ebebeb', objectFit: 'cover' }}/> ) : imagePlaceholder}
          <div> <h2 style={{ margin: 0 }}>{patient.name || 'N/A'}</h2> <div style={{ color: '#555', marginTop: 4 }}>{patient.contactInfo || patient.phone_num}</div> </div>
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
                  <button type="button" onClick={() => setCurrentTool('missing')} style={{ background: currentTool === 'missing' ? '#e3f2fd' : '#fff', border: currentTool === 'missing' ? '1px solid #2452a2' : '1px solid #ddd', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}> Mark Missing </button>
                  <button type="button" onClick={() => setCurrentTool('treat')} style={{ background: currentTool === 'treat' ? '#2452a2' : '#f0f0f0', border: '1px solid #ddd', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', color: currentTool === 'treat' ? 'white' : '#333', fontWeight: 600 }}> Select for Treatment </button>
              </div>
              <Odontogram selectedTeeth={treatTeeth} onSelectionChange={setTreatTeeth} toothStates={toothStates} onStateChange={handlePermanentToothStateChange} currentTool={currentTool} selectable={currentTool === 'treat'} />
            </div>
            
            <form style={{ flex: 1, background: '#f8f9fa', borderRadius: 8, minHeight: 280, padding: 20 }} onSubmit={handleTreatmentSubmit}>
              <div className="form-group">
                <label htmlFor="condition">Condition <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                <select id="condition" name="condition" value={form.condition} onChange={handleFormChange} onFocus={() => setCurrentTool('treat')} required >
                    <option value="">Select a condition</option> <option value="tooth decay">Tooth Decay</option> <option value="tooth cavity">Tooth Cavity</option> <option value="stained teeth">Stained Teeth</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="procedure">Treatment <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                <select id="procedure" name="procedure" value={form.procedure} onChange={handleFormChange} onFocus={() => setCurrentTool('treat')} required >
                    <option value="">Select Treatment</option> <option value="tooth cleaning">Tooth Cleaning</option> <option value="tooth removal">Tooth Removal</option> <option value="teeth whitening">Teeth Whitening</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="notes">Treatment Notes</label>
                <textarea id="notes" name="notes" value={form.notes} onChange={handleFormChange} onFocus={() => setCurrentTool('treat')} style={{ minHeight: 56 }} />  
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label"> <input type="checkbox" name="done" checked={form.done} onChange={handleFormChange} /> Treatment Done </label>
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
              const permanentState = patient.currentToothState || {};
              Object.entries(permanentState).forEach(([tooth, status]) => {
                  // Only show Missing and Treated in the medical record visual
                  if (status === 'missing' || status === 'treated') {
                      shadedStatus[tooth] = status;
                  }
              });
              const timelineSelectedTeeth = selectedTreatment?.teeth || [];
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, background: "#fff", borderRadius: 10, boxShadow: "0 2px 24px #eee", padding: 22, maxWidth: '100%', overflowX: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#223245', fontSize: 18 }}> Odontogram (Permanent Record) </div>
                  <Odontogram selectedTeeth={timelineSelectedTeeth} selectable={false} toothStates={shadedStatus} currentTool={'none'} onSelectionChange={()=>{}} />
                  
                  {form.isModelOpen && (
                      <div className="odontogram-modal-backdrop" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))} role="presentation">
                          <div className="odontogram-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                              <div className="odontogram-modal-header"> <h3>3D Teeth Visualization (Record)</h3> <button type="button" className="modal-close-btn" aria-label="Close" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))}> × </button> </div>
                              <div className="odontogram-modal-body">
                                  {/* Container required for rendering canvas */}
                                  <div style={{ width: '100%', height: '500px' }}>
                                      <TeethModelViewer selectedTeeth={timelineSelectedTeeth} toothStates={shadedStatus} />
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
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Treatment Record Timeline</div>
              {selectedTreatment && ( <button onClick={() => setSelectedTreatment(null)} style={{ background: '#f0f0f0', border: '1px solid #ddd', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', marginBottom: 12, fontSize: 14, fontWeight: 500, color: '#333' }}> ✕ Clear Selection </button> )}
              <RenderTreatmentsTimeline />
            </div>
          </div>
        )}

        {tab === "history" && <div style={{ marginTop: 30 }}> <RenderAppointmentHistory history={appointmentHistory} /> </div>}
        
        {tab === "info" && (
          <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 24px #f1f1f1' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 10 }}>General Information</div>
              <div style={{ display: 'grid', gap: 12 }}> <div><b>Name:</b> {patient.name || 'N/A'}</div> <div><b>Contact Number:</b> {patient.phone_num || <span style={{color:'#888'}}>N/A</span>}</div> <div><b>Email/Contact Info:</b> {patient.contactInfo || <span style={{color:'#888'}}>N/A</span>}</div> <div><b>Address:</b> {patient.address || <span style={{color:'#888'}}>N/A</span>}</div> <div><b>Gender:</b> {patient.gender || <span style={{color:'#888'}}>N/A</span>}</div> <div><b>Age:</b> {patient.age || <span style={{color:'#888'}}>N/A</span>}</div> <div><b>Marital Status:</b> {patient.status || <span style={{color:'#888'}}>N/A</span>}</div> <div><b>Occupation:</b> {patient.occupation || <span style={{color:'#888'}}>N/A</span>}</div> <div><b>Send Confirmation:</b> {patient.sendConfirmation ? "Yes" : "No"}</div> <div><b>Last Updated:</b> {patient.updated || 'N/A'}</div> </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 24px #f1f1f1' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 10 }}>Medical Details</div>
              <div style={{ display: 'grid', gap: 12 }}> <div> <b>Allergies:</b> { (patient.medicalHistory?.Allergies && patient.medicalHistory.Allergies.length > 0) ? <span style={{color: '#d9534f', fontWeight: 600}}>{patient.medicalHistory.Allergies.join(', ')}</span> : <span style={{color:'#888'}}>None</span> } </div> <div> <b>Condition Notes:</b> {patient.medicalHistory?.conditionNotes || <span style={{color:'#888'}}>N/A</span>} </div> <div> <b>Current Meds:</b> { (patient.medicalHistory?.currentMedications && patient.medicalHistory.currentMedications.length > 0) ? patient.medicalHistory.currentMedications.join(', ') : <span style={{color:'#888'}}>N/A</span> } </div> <div> <b>Is Pregnant:</b> {patient.isPregnant ? <span style={{color: '#d9534f', fontWeight: 600}}>Yes</span> : "No"} </div> <div> <b>Smoker:</b> {patient.smokingStatus ? <span style={{color: '#d9534f', fontWeight: 600}}>Yes</span> : "No"} </div> </div>
            </div>
          </div>
        )}
        </div>
        </div>
      </main>
    </div>
  );
}