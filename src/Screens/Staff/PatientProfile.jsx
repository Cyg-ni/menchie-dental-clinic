import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
// 👇️ ADDED FIREBASE IMPORTS
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'; 
import Odontogram from "./Odontogram.jsx";
import "./Layout.css";
import "./AddingPatientModal.css";
import "./Odontogram.css";

// Assuming db is imported from ../../firebase
const appointmentsCollectionRef = collection(db, "appointments");


const Icon = ({ name }) => {
// ... (Icon definition remains the same)
  switch (name) {
    case "dashboard":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
          <path d="M3 12h7V3H3v9zm11 9h7v-6h-7v6zM3 21h7v-6H3v6zm11-9h7V3h-7v9z"/>
        </svg>
      );

    case "appointments":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      );

    case "patients":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
          <circle cx="9" cy="7" r="4"/>
          <path d="M17 11a4 4 0 1 0-4-4"/>
          <path d="M3 21a6 6 0 0 1 12 0"/>
          <path d="M15 21a6 6 0 0 1 6-6"/>
        </svg>
      );

    case "settings":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .68.39 1.29 1 1.51.59.23 1.27.1 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.43.55-.56 1.23-.33 1.82.22.61.83 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.68 0-1.29.39-1.51 1z"/>
        </svg>
      );

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

// Helper to format date string (YYYY-MM-DD) for display
const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00'); 
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper to format time string (HH:MM) for display
const formatAppointmentTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m); 
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// --- Render Appointment History Component ---
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


export default function PatientProfile() {
  
  const { id } = useParams();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [tab, setTab] = useState("medical");
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(true);

  // New states for data
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); 
  const [appointmentHistory, setAppointmentHistory] = useState([]); 

  // Odontogram / Treatment states
  const [treatTeeth, setTreatTeeth] = useState([]);
  const [currentTool, setCurrentTool] = useState('issue'); // Default tool is now 'issue'
  const [toothStates, setToothStates] = useState({}); // PERMANENT STATE TRACKER

  const [form, setForm] = useState({
    condition: '',
    procedure: '',
    notes: '',
    done: false,
    isModelOpen: false, // State for 3D model visibility
    modelToothStates: {}
  });
  const [submitMsg, setSubmitMsg] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState(null); // Selected item on the timeline

  // Reset forms/state when tab or patient changes
  useEffect(() => {
    setTreatTeeth([]);
    setForm(f => ({ 
        condition: '', 
        procedure: '', 
        notes: '', 
        done: false,
        isModelOpen: f.isModelOpen, // Keep modal closed state 
        modelToothStates: f.modelToothStates
    })); 
    setSubmitMsg("");
    if (tab === 'next') setCurrentTool('treat'); // Default NEXT tab tool to 'treat'
  }, [tab, id]);

  
  // --- Data Initialization Effect ---
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


  // --- Data Fetching ---

  const getPatient = useCallback(async (patientId) => {
    // ... (Patient fetching logic remains the same)
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
    // ... (Appointment history fetching logic remains the same)
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

  
  // *** Treatment Form Handlers ***
  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setCurrentTool('treat');
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  
  // --- Odontogram Permanent State Change Handler ---
  const handlePermanentToothStateChange = async (toothId, tool) => {
      // ... (logic remains the same)
      let newState;
      const currentState = toothStates[toothId];
      
      if (tool === 'missing') {
          newState = currentState === 'missing' ? 'healthy' : 'missing';
      } else if (tool === 'issue') {
          newState = currentState === 'issue' ? 'healthy' : 'issue';
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
      
      setTreatTeeth([]); 
      setCurrentTool(tool); 
  };


  const handleStatusToggle = async (treatmentIndex, currentStatus) => {
      // ... (Status update logic remains the same) ...
      if (isUpdatingStatus || !patient || !patient.treatments) return;
      
      setIsUpdatingStatus(true);
      
      try {
          const updatedTreatments = [...patient.treatments];
          const newStatus = !currentStatus;
          updatedTreatments[treatmentIndex].done = newStatus;

          const patientDocRef = doc(db, "patients", id); 
          await updateDoc(patientDocRef, {
              treatments: updatedTreatments,
              updated: new Date().toISOString().split('T')[0] 
          });

          if (selectedTreatment === patient.treatments[treatmentIndex]) {
              setSelectedTreatment(updatedTreatments[treatmentIndex]);
          }

          setPatient(p => ({
              ...p,
              treatments: updatedTreatments
          }));


      } catch (error) {
          console.error("Error toggling treatment status:", error);
          alert("Failed to update status.");
      } finally {
          setIsUpdatingStatus(false);
      }
  };


  const handleTreatmentSubmit = async e => {
    e.preventDefault();
    
    // CRITICAL FIX 1: Validate ONLY if in 'treat' mode
    if (currentTool !== 'treat' || treatTeeth.length === 0 || !form.condition || !form.procedure) { 
        if (currentTool !== 'treat') {
            setSubmitMsg("Please switch to 'Select for Treatment' mode and select teeth to save a note.");
        } else {
            setSubmitMsg("Fill all required fields and select at least one tooth.");
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
        setCurrentTool('treat'); // Stay in 'treat' mode after submission
    } catch (error) {
        console.error("Error submitting treatment:", error);
        setSubmitMsg("Failed to add treatment. Check console for details.");
    }

    setTimeout(() => setSubmitMsg(''), 1400);
  };


  if (loading) {
    return <div style={{ padding: 48 }}>Loading Patient...</div>;
  }

  if (!patient) {
    return <div style={{ padding: 48 }}>Patient Not Found</div>;
  }

  // MODIFIED RenderTreatmentsTimeline for interactivity and removing Dentist
  const RenderTreatmentsTimeline = () => (
    <div style={{ marginTop: 12 }}>
      {(patient.treatments && patient.treatments.length > 0) ? (
        patient.treatments.map((t, i) => {
          const statusText = t.done ? 'Done' : 'Ongoing';
          const statusColor = t.done ? '#25994e' : '#d96a2f';
          
          return (
            <div 
              // FIX: Set selectedTreatment to this specific treatment object when clicked
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
              <div style={{ minWidth: 58, textAlign:'center', color:'#4a587d', fontWeight:700, fontSize:17, marginTop: 4 }}>
                <div style={{fontSize:18}}>{t.teeth.join(', ')}</div>
                <span style={{fontWeight:500, color:'#888',fontSize:11}}>
                  { t.teeth.length === 1 ? 'Tooth' : 'Teeth' }
                </span>
              </div>
              <div style={{flex:1}}>
                <div style={{ display:'flex', gap:32, marginBottom:4 }}>
                  <span><b>Date:</b> {t.date}</span>
                  <span><b>Condition:</b> {t.condition}</span>
                  <span><b>Treatment:</b> {t.procedure}</span>
                  
                  {/* Status Button */}
                  <span>
                    <b>Status:</b> 
                    <button 
                      onClick={(e) => {
                          e.stopPropagation(); 
                          const originalIndex = patient.treatments.findIndex(item => item === t);
                          if (originalIndex !== -1) {
                              handleStatusToggle(originalIndex, t.done); 
                          }
                      }}
                      disabled={isUpdatingStatus}
                      style={{
                          background: statusColor,
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: 4,
                          marginLeft: 8,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 12,
                          opacity: isUpdatingStatus ? 0.6 : 1
                      }}
                    >
                      {statusText}
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
      <button 
          className="icon-btn" 
          onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(o => !o);
        }}
      >
        ≡
      </button>
      
          <div className="brand-left">
            <div className="brand-logo" />
            <div className="brand-name">Menchie's Dental Clinic</div>
          </div>
          <div className="user">
            <div className="avatar" />
            <div className="user-meta">
              <div className="user-name">Juana Cruz</div>
              <div className="user-role">Chief Dentist</div>
            </div>
          </div>
        </header>

        <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${location.pathname.startsWith("/dashboard") ? "active" : ""}`}
            aria-label="Dashboard"
            onClick={() => navigate("/dashboard")}
          >
            <Icon name="dashboard" />
          </button>
          <button
            className={`nav-item ${location.pathname.startsWith("/schedule") ? "active" : ""}`}
            aria-label="Schedule"
            onClick={() => navigate("/schedule")}
          >
            <Icon name="appointments" />
          </button>
          <button
            className={`nav-item ${location.pathname.startsWith("/patient-list") ? "active" : ""}`}
            aria-label="Patients"
            onClick={() => navigate("/patient-list")}
          >
            <Icon name="patients" />
          </button>
          <button
            className={`nav-item ${location.pathname.startsWith("/settings") ? "active" : ""}`}
            aria-label="Settings"
            onClick={() => navigate("/settings")}
          >
            <Icon name="settings" />
          </button>
        </nav>
      </aside>

      <main className="main">
        <div style={{ padding: 28, maxWidth: 1300, margin: 'auto' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button onClick={() => navigate("/patient-list")} className="btn-secondary" style={{ marginRight: 36 }}>⟵ Back to List</button>
          {patient.image ? (
            <img src={patient.image} alt="profile" style={{ width: 76, height: 76, borderRadius: 50, border: '2px solid #ebebeb', objectFit: 'cover' }}/>
          ) : imagePlaceholder}
          <div>
            <h2 style={{ margin: 0 }}>{patient.name || 'N/A'}</h2> 
            <div style={{ color: '#555', marginTop: 4 }}>{patient.contactInfo || patient.phone_num}</div>
          </div>
          <div style={{ flex: 1 }} />
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 36, borderBottom: '2px solid #eee' }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className="link-btn"
              onClick={() => setTab(key)}
              style={{
                border: 0,
                background: 'none',
                color: tab === key ? '#2452a2' : '#505c6b',
                fontWeight: tab === key ? 700 : 500,
                fontSize: 16,
                padding: '10px 18px 8px 18px',
                borderBottom: tab === key ? '3px solid #2452a2' : '3px solid transparent',
                transition: 'border-bottom .15s'
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
        {tab === "next" && (
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            
            {/* --- ODONTOGRAM AND TOOL SELECTION --- */}
            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 24px #eee", padding: 22, minWidth: 340 }}>
              <div style={{ fontWeight: 700, color: '#223245', marginBottom: 10, fontSize: 18 }}>
                  Odontogram ({currentTool === 'treat' ? 'Select Teeth to Treat' : 'Mark Tooth State'})
              </div>
              
              {/* Tool Selection */}
              <div style={{ marginBottom: 15, display: 'flex', gap: 10, fontSize: 13, justifyContent: 'space-around' }}>
                  {/* Mark Missing Button */}
                  <button 
                      type="button" 
                      onClick={() => setCurrentTool('missing')} 
                      style={{ 
                          background: currentTool === 'missing' ? '#e3f2fd' : '#fff', 
                          border: currentTool === 'missing' ? '1px solid #2452a2' : '1px solid #ddd', 
                          padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 600
                      }}
                  >
                      Mark Missing
                  </button>
                  {/* Mark Issue Button */}
                  <button 
                      type="button" 
                      onClick={() => setCurrentTool('issue')} 
                      style={{ 
                          background: currentTool === 'issue' ? '#e3f2fd' : '#fff', 
                          border: currentTool === 'issue' ? '1px solid #2452a2' : '1px solid #ddd', 
                          padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 600
                      }}
                  >
                      Mark Issue
                  </button>
                  {/* Select for Treatment Button */}
                  <button 
                      type="button" 
                      onClick={() => setCurrentTool('treat')} 
                      style={{ 
                          background: currentTool === 'treat' ? '#2452a2' : '#f0f0f0', 
                          border: '1px solid #ddd', 
                          padding: '5px 10px', 
                          borderRadius: 5, 
                          cursor: 'pointer', 
                          color: currentTool === 'treat' ? 'white' : '#333',
                          fontWeight: 600
                      }}
                  >
                      Select for Treatment
                  </button>
              </div>

              {/* Odontogram Component */}
              <Odontogram 
                  selectedTeeth={treatTeeth} 
                  onSelectionChange={setTreatTeeth} 
                  toothStates={toothStates} 
                  onStateChange={handlePermanentToothStateChange}
                  currentTool={currentTool}
                  selectable={currentTool === 'treat'}
              />

            </div>
            
            {/* --- NEXT TREATMENT DETAILS FORM --- */}
            <form style={{ flex: 1, background: '#f8f9fa', borderRadius: 8, minHeight: 280, padding: 20 }} onSubmit={handleTreatmentSubmit}>
              <div className="form-group">
                <label htmlFor="condition">Condition <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                {/* --- EDITED: Replaced <input> with <select> for Condition --- */}
                <select 
                    id="condition" 
                    name="condition" 
                    value={form.condition} 
                    onChange={handleFormChange} 
                    onFocus={() => setCurrentTool('treat')}
                    required 
                >
                    <option value="">Select a condition</option> {/* Placeholder/default option */}
                    <option value="tooth decay">Tooth Decay</option>
                    <option value="tooth cavity">Tooth Cavity</option>
                    <option value="stained teeth">Stained Teeth</option>
                </select>
                {/* ------------------------------------------------------------- */}
            </div>
                <div className="form-group">
                    <label htmlFor="procedure">Treatment <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                    {/* --- EDITED: Replaced <input> with <select> --- */}
                    <select 
                        id="procedure" 
                        name="procedure" 
                        value={form.procedure} 
                        onChange={handleFormChange} 
                        onFocus={() => setCurrentTool('treat')}
                        required 
                    >
                        <option value="">Select Treatment</option> {/* Placeholder/default option */}
                        <option value="tooth cleaning">Tooth Cleaning</option>
                        <option value="tooth removal">Tooth Removal</option>
                        <option value="teeth whitening">Teeth Whitening</option>
                        <option value="brace adjustment">Brace Adjustment</option>
                    </select>
                    {/* ----------------------------------------------- */}
                </div>
              {/* Dentist field removed */}
              <div className="form-group">
                <label htmlFor="notes">Treatment Notes</label>
                <textarea 
                    id="notes" 
                    name="notes" 
                    value={form.notes} 
                    onChange={handleFormChange} 
                    onFocus={() => setCurrentTool('treat')}
                    style={{ minHeight: 56 }}
                />  
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="done" checked={form.done} onChange={handleFormChange} /> Treatment Done
                </label>
              </div>
              {submitMsg && <div style={{fontWeight:600, color: submitMsg.includes('Fill') ? '#c23c33':'#21965a', marginTop:7}}>{submitMsg}</div>}
              <div className="form-actions" style={{marginTop:16}}>
                <button type="submit" className="btn-primary" disabled={currentTool !== 'treat'}>Save Treatment Note</button>
              </div>
              
              {currentTool !== 'treat' && (
                  <p style={{ marginTop: 10, fontSize: 12, color: '#f49046' }}>
                      Note: Save button is enabled only when "Select for Treatment" mode is active.
                  </p>
              )}
            </form>
          </div>
        )}
        {tab === "medical" && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {(() => {
              let shadedStatus = {};
              
              // 1. Permanent State (Missing, Issue, Treated)
              const permanentState = patient.currentToothState || {};
              Object.entries(permanentState).forEach(([tooth, status]) => {
                  if (status === 'missing' || status === 'issue' || status === 'treated') {
                      shadedStatus[tooth] = status;
                  }
              });

              // 2. Determine Timeline Selection Overlay
              const timelineSelectedTeeth = selectedTreatment?.teeth || [];
              const treatmentSelectionStatus = {};
              
              // This is used to pass the selected treatment set to the 3D viewer
              if (selectedTreatment) {
                  timelineSelectedTeeth.forEach(tooth => {
                      // Use 'selected' class for timeline highlight
                      treatmentSelectionStatus[tooth] = 'selected'; 
                  });
              }
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, background: "#fff", borderRadius: 10, boxShadow: "0 2px 24px #eee", padding: 22, maxWidth: '100%', overflowX: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#223245', fontSize: 18 }}>
                    Odontogram (Permanent Record)
                  </div>
                  
                  {/* Odontogram in Medical Tab: Uses Permanent State + Selected Timeline Highlight */}
                  <Odontogram 
                    selectedTeeth={timelineSelectedTeeth} // Teeth actively selected in the timeline
                    selectable={false} 
                    toothStates={shadedStatus} // Permanent/Ongoing status
                    currentTool={'none'} // Disable any tool interaction
                    onSelectionChange={()=>{}} 
                  />
                  
                  {/* 3D Model Modal (for Medical Record) */}
                  {form.isModelOpen && (
                      <div className="odontogram-modal-backdrop" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))} role="presentation">
                          <div className="odontogram-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                              <div className="odontogram-modal-header">
                                  <h3>3D Teeth Visualization (Record)</h3>
                                  <button type="button" className="modal-close-btn" aria-label="Close" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))}>
                                      ×
                                  </button>
                              </div>
                              <div className="odontogram-modal-body">
                                  <TeethModelViewer 
                                      // Pass permanent state for missing/issue/treated colors
                                      toothStates={shadedStatus}
                                      // Pass the timeline selection set separately for Blue highlight
                                      selectedTeeth={timelineSelectedTeeth}
                                  />
                              </div>
                              <div className="odontogram-modal-footer">
                                  <button type="button" className="modal-close-secondary" onClick={() => setForm(f => ({ ...f, isModelOpen: false }))}>
                                      Close
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

                </div>
              );
            })()}
            <div style={{ flex: 1, background: '#f7f7f7', borderRadius: 8, minHeight: 280, padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Treatment Record Timeline</div>
              {selectedTreatment && (
                <button 
                  onClick={() => setSelectedTreatment(null)}
                  style={{
                    background: '#f0f0f0',
                    border: '1px solid #ddd',
                    padding: '8px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    marginBottom: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#333'
                  }}
                >
                  ✕ Clear Selection
                </button>
              )}
              <RenderTreatmentsTimeline />
            </div>
          </div>
        )}
        {tab === "history" && (
          <div style={{ marginTop: 30 }}>
             <RenderAppointmentHistory history={appointmentHistory} />
          </div>
        )}
        {tab === "info" && (
          <div style={{ marginTop: 30, background: '#fff', borderRadius: 8, padding: 32, maxWidth: 560, boxShadow: '0 2px 24px #f1f1f1'}}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16}}>General Information</div>
            <div><b>Name:</b> {patient.name || 'N/A'}</div>
            <div><b>Contact Number:</b> {patient.phone_num || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Email/Contact Info:</b> {patient.contactInfo || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Address:</b> {patient.address || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Gender:</b> {patient.gender || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Age:</b> {patient.age || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Send Confirmation:</b> {patient.sendConfirmation ? "Yes" : "No"}</div> 
            <div><b>Last Updated:</b> {patient.updated || 'N/A'}</div>
          </div>
        )}
        </div>
        </div>
      </main>
    </div>
  );
}