import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// Ensure you have imported all necessary Firestore functions
import { db } from '../../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import "./Layout.css";
import "./PatientList.css";
import "./AddingPatientModal.css";
// Assuming AddingPatientModal.jsx is in the same directory as PatientList.jsx
import AddingPatientModal from './AddingPatientModal.jsx'; 

// -----------------------------------------------------------
// 1. CONSTANTS AND UTILS
// -----------------------------------------------------------

// Reference to the 'patients' collection
const patientsCollectionRef = collection(db, "patients");

// Icon component (kept for completeness)
const Icon = ({ name, active }) => {
    switch (name) {
      case "dashboard":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12h7V3H3v9zm11 9h7v-6h-7v6zM3 21h7v-6H3v6zm11-9h7V3h-7v9z" />
          </svg>
        );
      case "appointments":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "patients":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#888" : "#444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ filter: active ? 'grayscale(100%)' : 'none' }}>
            <circle cx="9" cy="7" r="4" />
            <path d="M17 11a4 4 0 1 0-4-4" />
            <path d="M3 21a6 6 0 0 1 12 0" />
            <path d="M15 21a6 6 0 0 1 6-6" />
          </svg>
        );
      case "settings":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .68.39 1.29 1 1.51.59.23 1.27.1 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.43.55-.56 1.23-.33 1.82.22.61.83 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.68 0-1.29.39-1.51 1z" />
          </svg>
        );
      default:
        return null;
    }
};

const imagePlaceholder = (
    <div className="image-placeholder">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="14" rx="2"/>
            <path d="M7 18l3-3"/>
            <path d="M14 18l3-3"/>
        </svg>
    </div>
);

function EditIcon() {
    return (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#666"><path d="M4 21v-4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4" strokeWidth="2"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7.5 18.5l-4 1 1-4L16.5 3.5Z" strokeWidth="2"/></svg>
    );
}
function DeleteIcon() {
    return (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#d23c3c"><rect x="5" y="6" width="14" height="12" rx="2" strokeWidth="2"/><path d="M10 11v4m4-4v4" strokeWidth="2"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeWidth="2"/></svg>
    );
}

// -----------------------------------------------------------
// 2. PROFILE MODAL (Kept for viewing details)
// -----------------------------------------------------------

function PatientProfileModal({ open, patient, onClose }) {
    // Utility function to display array content clearly
    const formatArray = (arr) => arr?.length > 0 && arr[0] !== "" ? arr.join(', ') : <span style={{color:'#888'}}>None</span>;
    
    if (!open || !patient) return null;

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="modal add-patient-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Patient Profile: {patient.name}</div>
                    <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body add-patient-body">
                    <div className="patient-form-grid">
                        <section className="patient-details-section">
                            <div className="section-title">Patient Details</div>
                            <div className="profile-detail"><b>Patient ID:</b> {patient.id}</div>
                            <div className="profile-detail"><b>Name:</b> {patient.name}</div>
                            <div className="profile-detail"><b>Contact Number:</b> {patient.phone_num || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Email/Contact Info:</b> {patient.contactInfo || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Address:</b> {patient.address || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Last Updated:</b> {patient.updated || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="section-title" style={{marginTop:'15px'}}>Vitals & History</div>
                            <div className="profile-detail"><b>Age:</b> {patient.age || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Gender:</b> {patient.gender || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Occupation:</b> {patient.occupation || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Marital Status:</b> {patient.status || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Complaint:</b> {patient.complaint || <span style={{color:'#888'}}>N/A</span>}</div>
                            <div className="profile-detail"><b>Smoking Status:</b> {patient.smokingStatus ? "Yes" : "No"}</div>
                            <div className="profile-detail"><b>Pregnant:</b> {patient.isPregnant ? "Yes" : "No"}</div>
                            <div className="section-title" style={{marginTop:'15px'}}>Medical Details</div>
                            <div className="profile-detail"><b>Allergies:</b> {formatArray(patient.medicalHistory?.Allergies)}</div>
                            <div className="profile-detail"><b>Condition Notes:</b> {patient.medicalHistory?.conditionNotes || <span style={{color:'#888'}}>N/A</span>}</div>
                            {/* Simplified Current Meds display for profile */}
                            <div className="profile-detail"><b>Current Meds:</b> {patient.medicalHistory?.currentMedications?.length > 0 ? (patient.medicalHistory.currentMedications[0]?.name || 'Yes, details N/A') : <span style={{color:'#888'}}>N/A</span>}</div>
                        </section>
                        <div className="divider"></div>
                        <section className="patient-picture-section">
                            <div className="section-title">Patient Picture</div>
                            <div className="image-upload-area">
                                {patient.image
                                    ? <img src={patient.image} alt="Patient" className="preview-image" />
                                    : imagePlaceholder}
                            </div>
                            <div style={{marginTop: '20px', textAlign: 'center'}}>
                                <button className="btn-secondary" onClick={() => {
                                    onClose(); 
                                    // Placeholder for navigation/other action
                                }}>
                                    Full Dental Chart
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------
// 3. MAIN PATIENT LIST COMPONENT
// -----------------------------------------------------------

export default function PatientList() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    // State for Add/Edit Modal (AddingPatientModal.jsx)
    const [showModal, setShowModal] = useState(false); 
    const [editPatient, setEditPatient] = useState(null); // Holds patient data if editing
    
    // State for Profile Modal (PatientProfileModal)
    const [profilePatient, setProfilePatient] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    
    const [menuOpen, setMenuOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();


    // --- FIREBASE FETCH (READ) ---
    const getPatients = async () => {
        setLoading(true);
        try {
            const data = await getDocs(patientsCollectionRef);
            const patientData = data.docs.map(doc => {
                const firestoreData = doc.data();
                return { 
                    id: doc.id, // Use Firestore document ID as the unique key
                    ...firestoreData,
                    updated: firestoreData.updated || 'N/A',
                    // Ensure age is treated as a number if it exists
                    age: typeof firestoreData.age === 'number' ? firestoreData.age : (parseInt(firestoreData.age) || null)
                };
            });
            setPatients(patientData);
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getPatients();
    }, []);

    // --- FILTERING ---
    const filtered = patients.filter(p =>
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.phone_num || "").includes(search)
    );


    // --- MODAL HANDLERS (CREATE/UPDATE) ---
    
    const openAdd = () => {
        setEditPatient(null); // Ensure no patient is being edited
        setShowModal(true);
    };

    const openEdit = (patient) => {
        setEditPatient(patient); // Set the patient data for the modal to load
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditPatient(null); // Clear edit state on close
    };

    // --- PROFILE MODAL HANDLERS ---
    
    const closeProfile = () => {
        setShowProfile(false);
        setProfilePatient(null);
    };

    // --- DELETE OPERATION (DELETE) ---
    const handleDelete = async (patient) => {
        if (!window.confirm(`Are you sure you want to delete patient ${patient.name} (${patient.id})? This cannot be undone.`)) return;

        try {
            const patientDoc = doc(db, "patients", patient.id);
            await deleteDoc(patientDoc);
            
            // Update local state by filtering out the deleted patient
            setPatients(patients.filter(p => p.id !== patient.id));
            console.log(`Patient ${patient.id} deleted successfully.`);
        } catch (error) {
            console.error("Error deleting patient:", error);
            alert("Failed to delete patient. Check console for details.");
        }
    };


    // --- RENDERING ---
    return (
        <div className="dashboard">
            <header className="topbar">
                <button
                    className="icon-btn menu-toggle"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(o => !o);
                    }}
                >
                    ≡
                </button>
                    <div className="brand-left">
                        <div className="brand-logo" />
                        <div className="brand-name">jisong's Dental Clinic</div>
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
                        style={location.pathname.startsWith("/patient-list") ? { background: '#ececec' } : {}}
                    >
                        <Icon name="patients" active={location.pathname.startsWith("/patient-list")} />
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
                <div className="patient-list-container">
                    <header className="patient-header">
                        <h1>Patient List {loading && <span style={{fontSize: '14px', color: '#999'}}>(Loading...)</span>}</h1>
                    </header>
                    <div className="patient-actions">
                        <div className="search-bar-container">
                            <input
                                className="search-input"
                                type="text"
                                placeholder="Patient Search (by Name or Phone)"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <button className="btn-primary" onClick={openAdd} style={{ marginLeft: "16px" }}>
                            + Add Patient
                        </button>
                    </div>
                    <div className="patient-table-scroll">
                        <table className="patient-table">
                            <thead>
                                <tr>
                                    <th>Patient Name</th>
                                    <th>Phone Number</th>
                                    <th>Last Updated</th>
                                    <th>Edit</th>
                                    <th>Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="empty-row">Loading patient data from Firebase...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="empty-row">No patients found.</td></tr>
                                ) : filtered.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <button
                                                className="link-btn"
                                                style={{ background: "none", border: "none", padding: 0, color: "#1e5276", fontWeight: 600, cursor: "pointer", fontSize: "15px" }}
                                                onClick={() => setProfilePatient(p) || setShowProfile(true)} // Open profile on click
                                            >
                                                {p.name || 'N/A'}
                                            </button>
                                        </td>
                                        <td>{p.phone_num || 'N/A'}</td>
                                        <td>{p.updated}</td>
                                        <td>
                                            {/* Calls the openEdit handler */}
                                            <button className="icon-btn" title="Edit" onClick={() => openEdit(p)}>
                                                <EditIcon />
                                            </button>
                                        </td>
                                        <td>
                                            {/* Calls the handleDelete handler */}
                                            <button className="icon-btn" title="Delete" onClick={() => handleDelete(p)}>
                                                <DeleteIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* 👇️ MODAL RENDERING BLOCK (Handles Add and Edit) 👇️ */}
                    {showModal && (
                        <AddingPatientModal 
                            onClose={closeModal} 
                            // onSuccess calls getPatients to refresh the list after Add/Edit
                            onSuccess={getPatients} 
                            // Pass the patientToEdit object (null for Add, object for Edit)
                            patientToEdit={editPatient} 
                        />
                    )}
                    {/* 👆️ MODAL RENDERING BLOCK (Handles Add and Edit) 👆️ */}

                    {/* Patient Profile Modal */}
                    <PatientProfileModal
                        open={showProfile}
                        patient={profilePatient}
                        onClose={closeProfile}
                    />
                </div>
            </main>
        </div>
    );
}