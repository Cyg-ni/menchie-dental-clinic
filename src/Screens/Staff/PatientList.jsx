import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
<<<<<<< HEAD
import "./PatientList.css";
import "./MainDashboard.css";
=======
import "./Layout.css";
import "./PatientList.css";
>>>>>>> 91bcf2652972863c1be99eaa5ea17e054103a645
import "./AddingPatientModal.css";

// Sidebar icon (copied from ScheduleDashboard)
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

const initialPatients = [
  { id: 1, firstName: "Juan", lastName: "Cruz", updated: "2025-10-29", contactNumber: "", service: "", contactInfo: "email@address.com", sendConfirmation: true, image: null },
  { id: 2, firstName: "Bella", lastName: "Reyes", updated: "2025-10-23", contactNumber: "", service: "", contactInfo: "email@address.com", sendConfirmation: true, image: null },
  { id: 3, firstName: "Maria", lastName: "Santos", updated: "2025-10-19", contactNumber: "", service: "", contactInfo: "email@address.com", sendConfirmation: true, image: null },
  { id: 4, firstName: "Allan", lastName: "Gabe", updated: "2025-10-18", contactNumber: "", service: "", contactInfo: "email@address.com", sendConfirmation: true, image: null },
  { id: 5, firstName: "Michael", lastName: "Lopez", updated: "2025-10-15", contactNumber: "", service: "", contactInfo: "email@address.com", sendConfirmation: true, image: null }
];

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

function PatientModal({ open, initial, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    contactNumber: initial?.contactNumber || "",
    service: initial?.service || "",
    contactInfo: initial?.contactInfo || "email@address.com",
    firstName: initial?.firstName || "",
    lastName: initial?.lastName || "",
    sendConfirmation: typeof initial?.sendConfirmation === "boolean" ? initial.sendConfirmation : true,
    image: initial?.image || null
  });
  const [imagePreview, setImagePreview] = useState(initial?.image || null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result }));
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) return;
    onSubmit({ ...initial, ...formData });
  };

  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal add-patient-modal">
        <div className="modal-header">
          <div className="modal-title">{initial?.id ? "Edit Patient" : "Add New Patient"}</div>
          <button className="modal-close" aria-label="Close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body add-patient-body">
          <div className="patient-form-grid">
            <section className="patient-details-section">
              <div className="section-title">Patient Details</div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="contactNumber">Contact Number</label>
                  <input
                    type="text"
                    id="contactNumber"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contactInfo">Contact Information</label>
                  <input
                    type="text"
                    id="contactInfo"
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="sendConfirmation"
                      checked={formData.sendConfirmation}
                      onChange={handleInputChange}
                    />
                    <span>Send email/sms confirmation</span>
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">{initial?.id ? "Save" : "Add User"}</button>
                  <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
                </div>
              </form>
            </section>
            <div className="divider"></div>
            <section className="patient-picture-section">
              <div className="section-title">Patient Picture</div>
              <div className="image-upload-area">
                {imagePreview ? (
                  <img src={imagePreview} alt="Patient preview" className="preview-image" />
                ) : (
                  imagePlaceholder
                )}
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                />
                <label htmlFor="imageUpload" className="select-image-btn">
                  Select image
                </label>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientProfileModal({ open, patient, onClose }) {
  if (!open || !patient) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal add-patient-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Patient Profile</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body add-patient-body">
          <div className="patient-form-grid">
            <section className="patient-details-section">
              <div className="section-title">Patient Details</div>
              <div className="profile-detail"><b>First Name:</b> {patient.firstName}</div>
              <div className="profile-detail"><b>Last Name:</b> {patient.lastName}</div>
              <div className="profile-detail"><b>Contact Number:</b> {patient.contactNumber || <span style={{color:'#888'}}>N/A</span>}</div>
              <div className="profile-detail"><b>Contact Info:</b> {patient.contactInfo || <span style={{color:'#888'}}>N/A</span>}</div>
              <div className="profile-detail"><b>Send Confirmation:</b> {patient.sendConfirmation ? "Yes" : "No"}</div>
              <div className="profile-detail"><b>Last Updated:</b> {patient.updated}</div>
            </section>
            <div className="divider"></div>
            <section className="patient-picture-section">
              <div className="section-title">Patient Picture</div>
              <div className="image-upload-area">
                {patient.image
                  ? <img src={patient.image} alt="Patient" className="preview-image" />
                  : imagePlaceholder}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PatientList() {
  const [patients, setPatients] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [profilePatient, setProfilePatient] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  // Sidebar state
<<<<<<< HEAD
  const [menuOpen, setMenuOpen] = useState(false);
=======
  const [menuOpen, setMenuOpen] = useState(true);
>>>>>>> 91bcf2652972863c1be99eaa5ea17e054103a645
  const navigate = useNavigate();
  const location = useLocation();

  const filtered = patients.filter(p =>
    (p.firstName + " " + p.lastName).toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditPatient(null);
    setShowModal(true);
  };

  const openEdit = (patient) => {
    setEditPatient(patient);
    setShowModal(true);
  };

  const openProfile = (patient) => {
    setProfilePatient(patient);
    setShowProfile(true);
  };

  const closeProfile = () => {
    setShowProfile(false);
    setProfilePatient(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPatient(null);
  };

  const handleDelete = (patient) => {
    if (window.confirm("Delete this patient?")) {
      setPatients(patients.filter(p => p.id !== patient.id));
    }
  };

  const handleSubmit = (patient) => {
    if (patient.id) {
      // Edit
      setPatients(ps => ps.map(p => p.id === patient.id ? { ...patient, updated: new Date().toISOString().slice(0, 10) } : p));
    } else {
      // Add
      setPatients(ps => [
        ...ps,
        { ...patient, id: Math.max(0, ...ps.map(p => p.id)) + 1, updated: new Date().toISOString().slice(0,10) }
      ]);
    }
    closeModal();
  };

  // Layout starts here (dashboard shell)
  return (
    <div className="dashboard">
<<<<<<< HEAD
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button
            className="icon-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            ≡
          </button>
        </div>
=======
      <header className="topbar  ref={menuRef}">
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
>>>>>>> 91bcf2652972863c1be99eaa5ea17e054103a645
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
          <button className="nav-item" aria-label="Settings"><Icon name="settings" /></button>
        </nav>
      </aside>
      <main className="main">
<<<<<<< HEAD
        <header className="topbar">
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
=======
>>>>>>> 91bcf2652972863c1be99eaa5ea17e054103a645
        <div className="patient-list-container">
          <header className="patient-header">
            <h1>Patient List</h1>
          </header>
          <div className="patient-actions">
            <div className="search-bar-container">
              <input
                className="search-input"
                type="text"
                placeholder="Patient Search"
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
                  <th>Last Updated</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="empty-row">No patients found.</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="link-btn"
                        style={{ background: "none", border: "none", padding: 0, color: "#1e5276", fontWeight: 600, cursor: "pointer", fontSize: "15px" }}
                        onClick={() => navigate(`/patient-list/${p.id}`)}
                      >
                        {p.firstName} {p.lastName}
                      </button>
                    </td>
                    <td>{p.updated}</td>
                    <td>
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(p)}>
                        <EditIcon />
                      </button>
                    </td>
                    <td>
                      <button className="icon-btn" title="Delete" onClick={() => handleDelete(p)}>
                        <DeleteIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PatientModal
            open={showModal}
            initial={editPatient}
            onSubmit={handleSubmit}
            onCancel={closeModal}
          />
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
