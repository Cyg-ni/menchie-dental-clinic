import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
// 👇️ ADDED FIREBASE IMPORTS
import { db } from '../../firebase'; // Assuming the path is correct
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import Odontogram from "./Odontogram.jsx";
import "./Layout.css";
import "./AddingPatientModal.css";
import "./Odontogram.css";

const Icon = ({ name }) => {
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

// Removed hardcoded patient data

const imagePlaceholder = (
  <div className="image-placeholder" style={{ width: 76, height: 76 }}>
    <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2"/>
      <path d="M7 18l3-3"/>
      <path d="M14 18l3-3"/>
    </svg>
  </div>
);

// Removed loadPatients and savePatients functions

export default function PatientProfile() {
  // ----------------------------------------------
  // 👇️ START: ALL HOOKS MOVED TO THE TOP (Rules of Hooks Fix)
  // ----------------------------------------------
  const { id } = useParams();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [tab, setTab] = useState("medical");
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(true);

  // New states for single patient object and loading
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true); 

  // Next Treatment hooks
  const [treatTeeth, setTreatTeeth] = useState([]);
  const [form, setForm] = useState({
    condition: '',
    procedure: '',
    dentist: '',
    notes: '',
    done: false
  });
  const [submitMsg, setSubmitMsg] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState(null);

  // Reset forms/state when tab or patient changes
  useEffect(() => {
    setTreatTeeth([]);
    setForm({ condition: '', procedure: '', dentist: '', notes: '', done: false });
    setSubmitMsg("");
  }, [tab, id]);

  // 👇️ EFFECT TO FETCH PATIENT DATA (Firestore Integration Fix)
  const getPatient = async (patientId) => {
    if (!patientId) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
        const docRef = doc(db, "patients", patientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            // Document ID (string) is now correctly used as the patient's id
            setPatient({ id: docSnap.id, ...docSnap.data() }); 
        } else {
            setPatient(null); // Patient Not Found
        }
    } catch (error) {
        console.error("Error fetching patient:", error);
        setPatient(null);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    getPatient(id);
  }, [id]); // Re-run when the URL ID changes
  // ----------------------------------------------
  // 👆️ END: ALL HOOKS ARE MOVED HERE
  // ----------------------------------------------
  
  // 👇️ CONDITIONAL RETURNS (Now safe because all hooks are above)
  if (loading) {
    return <div style={{ padding: 48 }}>Loading Patient...</div>;
  }

  if (!patient) {
    return <div style={{ padding: 48 }}>Patient Not Found</div>;
  }

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  // 👇️ UPDATED TREATMENT SUBMISSION LOGIC (Firestore update)
  const handleTreatmentSubmit = async e => {
    e.preventDefault();
    if (!form.condition || !form.procedure || !form.dentist || treatTeeth.length === 0) {
      setSubmitMsg("Fill all required fields and select at least one tooth.");
      return;
    }
    
    // Create new treatment object
    const newTreat = {
      ...form,
      teeth: [...treatTeeth],
      date: new Date().toISOString().split('T')[0],
    };

    try {
        // Prepare the new list of treatments
        const updatedTreatments = [newTreat, ...(patient.treatments || [])];
        
        // Reference to the patient document
        const patientDocRef = doc(db, "patients", id); 
        
        // Update the document in Firestore
        await updateDoc(patientDocRef, {
            treatments: updatedTreatments,
            odontogram: [...treatTeeth], // Update the current odontogram/teeth treated
            updated: new Date().toISOString().split('T')[0] // Update the last updated date
        });

        // Re-fetch patient data to update the local state with the new treatments
        await getPatient(id); 

        setSubmitMsg("Treatment added!");
        setTreatTeeth([]);
        setForm({ condition: '', procedure: '', dentist: '', notes: '', done: false });
    } catch (error) {
        console.error("Error submitting treatment:", error);
        setSubmitMsg("Failed to add treatment. Check console for details.");
    }

    setTimeout(() => setSubmitMsg(''), 1400);
  };

  // ---- rendering ----
  const RenderTreatmentsTimeline = () => (
    <div style={{ marginTop: 12 }}>
      {(patient.treatments && patient.treatments.length > 0) ? (
        patient.treatments.map((t, i) => (
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
                <span><b>Dentist:</b> {t.dentist}</span>
                <span><b>Status:</b> {t.done ? <span style={{color:'#25994e'}}>Done</span> : <span style={{color:'#d96a2f'}}>Ongoing</span>}</span>
              </div>
              <div style={{fontSize:14, margin: '8px 0'}}>{t.notes}</div>
            </div>
          </div>
        ))
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
            {/* Displaying name from firestore document (firstName and lastName may not exist) */}
            <h2 style={{ margin: 0 }}>{patient.name || 'N/A'}</h2> 
            <div style={{ color: '#555', marginTop: 4 }}>{patient.contactInfo || patient.phone_num}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn-primary">Create Appointment</button>
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
            {/* Interactable Odontogram + Treatment Notes Form */}
            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 24px #eee", padding: 22, minWidth: 340 }}>
              <div style={{ fontWeight: 700, color: '#223245', marginBottom: 10, fontSize: 18 }}>Odontogram (Select Teeth to Treat)</div>
              <Odontogram selectedTeeth={treatTeeth} onSelectionChange={setTreatTeeth} />
            </div>
            <form style={{ flex: 1, background: '#f8f9fa', borderRadius: 8, minHeight: 280, padding: 20 }} onSubmit={handleTreatmentSubmit}>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>Next Treatment Details</div>
              <div className="form-group">
                <label htmlFor="condition">Condition <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                <input id="condition" name="condition" value={form.condition} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="procedure">Treatment <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                <input id="procedure" name="procedure" value={form.procedure} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="dentist">Dentist <span style={{color:'#d54', fontWeight:600}}>*</span></label>
                <input id="dentist" name="dentist" value={form.dentist} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="notes">Treatment Notes</label>
                <textarea id="notes" name="notes" value={form.notes} onChange={handleFormChange} style={{ minHeight: 56 }}/>  
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="done" checked={form.done} onChange={handleFormChange} /> Treatment Done
                </label>
              </div>
              {submitMsg && <div style={{fontWeight:600, color: submitMsg.includes('Fill') ? '#c23c33':'#21965a', marginTop:7}}>{submitMsg}</div>}
              <div className="form-actions" style={{marginTop:16}}>
                <button type="submit" className="btn-primary">Save Treatment Note</button>
              </div>
            </form>
          </div>
        )}
        {tab === "medical" && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {(() => {
              let shadedTeeth = [], shadedStatus = {}, displayTeeth = [];
              
              // If a treatment is selected, show its odontogram; otherwise show all treatments
              if (selectedTreatment) {
                displayTeeth = selectedTreatment.teeth;
                const status = selectedTreatment.done ? 'done' : 'ongoing';
                selectedTreatment.teeth.forEach(tooth => {
                  shadedStatus[tooth] = status;
                });
                shadedTeeth = selectedTreatment.teeth;
              } else if (patient.treatments) {
                const statusOrder = { ongoing: 2, done: 1 };
                const teethMap = {};
                for (const t of patient.treatments) {
                  const st = t.done ? 'done' : 'ongoing';
                  for (const tooth of t.teeth) {
                    if (!teethMap[tooth] || statusOrder[st] > statusOrder[teethMap[tooth]])
                      teethMap[tooth] = st;
                  }
                }
                shadedTeeth = Object.keys(teethMap).map(Number);
                shadedStatus = teethMap;
              }
              
              return (
                <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 24px #eee", padding: 22, maxWidth: '100%', overflowX: 'auto' }}>
                  <div style={{ fontWeight: 700, color: '#223245', marginBottom: 10, fontSize: 18 }}>
                    Odontogram{selectedTreatment ? ' - ' + selectedTreatment.date : ''}
                  </div>
                  <Odontogram selectedTeeth={displayTeeth} selectable={false} shadedTeeth={shadedTeeth} shadedStatus={shadedStatus}/>
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
        {tab === "info" && (
          <div style={{ marginTop: 30, background: '#fff', borderRadius: 8, padding: 32, maxWidth: 560, boxShadow: '0 2px 24px #f1f1f1'}}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16}}>General Information</div>
            <div><b>Name:</b> {patient.name || 'N/A'}</div>
            <div><b>Contact Number:</b> {patient.phone_num || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Email/Contact Info:</b> {patient.contactInfo || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Address:</b> {patient.address || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Gender:</b> {patient.gender || <span style={{color:'#888'}}>N/A</span>}</div>
            <div><b>Age:</b> {patient.age || <span style={{color:'#888'}}>N/A</span>}</div>
            {/* Assuming sendConfirmation is a key in your Firestore document */}
            <div><b>Send Confirmation:</b> {patient.sendConfirmation ? "Yes" : "No"}</div> 
            <div><b>Last Updated:</b> {patient.updated || 'N/A'}</div>
          </div>
        )}
        {tab === "history" && (
          <div style={{marginTop:30,padding:24}}>Appointment history coming soon…</div>
        )}
        </div>
        </div>
      </main>
    </div>
  );
}