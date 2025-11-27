import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// Assuming the Firebase context is exported correctly from the shared file
import { db } from "../../firebase"; 
import { collection, getDocs, query, where } from 'firebase/firestore'; 

import "./MainDashboard.css";
import "./Layout.css";
import AppointmentsModal from "./AppointmentsModal.jsx";
import AddingPatientModal from "./AddingPatientModal.jsx";

// Define collection reference using the imported db instance
const appointmentsCollectionRef = collection(db, "appointments");
// const patientsCollectionRef = collection(db, "patients"); // Not strictly needed here

// --- UTILITY COMPONENTS ---
const Placeholder = ({ className }) => (
  <div className={`ph ${className || ""}`}>
    <svg viewBox="0 0 100 60" width="60%" height="60%" aria-hidden>
      <rect x="0" y="0" width="100" height="60" fill="#e6e6e6" />
      <circle cx="30" cy="20" r="6" fill="#cfcfcf" />
      <path d="M5 55 L35 25 L55 40 L95 55 Z" fill="#cfcfcf" />
    </svg>
  </div>
);

const StatPill = ({ label }) => <div className="stat-pill">{label}</div>;

const EllipsisIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <circle cx="5" cy="12" r="2" fill="#ffffff" />
    <circle cx="12" cy="12" r="2" fill="#ffffff" />
    <circle cx="19" cy="12" r="2" fill="#ffffff" />
  </svg>
);

const Icon = ({ name }) => {
  switch (name) {
    case "dashboard":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12h7V3H3v9zm11 9h7v-6h-7v6zM3 21h7v-6H3v6zm11-9h7V3h-7v9z"/>
        </svg>
      );
    case "appointments":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      );
    case "patients":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="9" cy="7" r="4"/>
          <path d="M17 11a4 4 0 1 0-4-4"/>
          <path d="M3 21a6 6 0 0 1 12 0"/>
          <path d="M15 21a6 6 0 0 1 6-6"/>
        </svg>
      );
    case "settings":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .68.39 1.29 1 1.51.59.23 1.27.1 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.43.55-.56 1.23-.33 1.82.22.61.83 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.68 0-1.29.39-1.51 1H21a2 2 0 1 1 0 4h-.09c-.68 0-1.29.39-1.51 1z"/>
        </svg>
      );
    case "logout":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      );
    default:
      return null;
  }
};

const MainDashboard = () => {
  // --- STATE MANAGEMENT ---
  const [menuOpen, setMenuOpen] = useState(true);
  const menuRef = useRef(null);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [showAddingPatient, setShowAddingPatient] = useState(false);
  
  // State for Firebase Data
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [upcomingAppointmentCount, setUpcomingAppointmentCount] = useState(0); 
  
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();


  // --- Data Fetching Functions ---

  const getPendingAppointments = useCallback(async () => {
    try {
        // FIX: Use dot notation to correctly query the nested status field
        const q = query(
            appointmentsCollectionRef, 
            where("status.isPending", "==", "Approval Pending") 
        );

        const data = await getDocs(q);
        const pendingData = data.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setPendingAppointments(pendingData);
        return pendingData.length;
    } catch (error) {
        console.error("Error fetching pending appointments:", error);
        return 0;
    }
  }, []); 

  const getUpcomingAppointments = useCallback(async () => {
    const now = Date.now(); 
    
    try {
        const q = query(
            appointmentsCollectionRef, 
            where("status.isScheduled", "==", "Scheduled")
        );
        const data = await getDocs(q);

        let futureCount = 0;
        data.docs.forEach(doc => {
            const apptData = doc.data();
            
            // Check if the appointment time is in the future
            if (apptData.dateTime && apptData.dateTime.toDate) {
                const apptTimestamp = apptData.dateTime.toDate().getTime();
                
                if (apptTimestamp > now) {
                    futureCount++;
                }
            }
        });
        
        setUpcomingAppointmentCount(futureCount);
        return futureCount;

    } catch (error) {
        console.error("Error fetching upcoming appointments:", error);
        return 0;
    }
  }, []); 

  
  const fetchDashboardData = useCallback(async () => {
      setLoading(true);
      
      await Promise.all([
          getPendingAppointments(),
          getUpcomingAppointments()
      ]);
      
      setLoading(false);
      
  }, [getPendingAppointments, getUpcomingAppointments]);


  useEffect(() => {
    fetchDashboardData(); 

    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(true);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [fetchDashboardData]); 


  return (
    <div className="dashboard">

      <header className="topbar" ref={menuRef}>
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
        <section className="main-grid">
          <div className="card list">
            <div className="card-title with-icon">
              <span>Recent Patients</span>
            </div>
            <ul className="list-items">
              {["Maloy Mag","Jason Gieb","Darel Horma","Mikael Renz","Miguel Itto"].map((n, i) => (
                <li className="list-item" key={i}>
                  <div className="avatar small" />
                  <div className="item-meta">
                    <div className="item-title">{n}</div>
                    <div className="item-sub">August 10, 2025</div>
                  </div>
                  <button className="chev">›</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card hero">
            <div className="section-title">
              <span className="muted">Good Morning,</span> Juana
            </div>
            <div className="hero-cards">
              <div className="hero-card">
                <Placeholder />
                <button className="link">Edit Clinic Information</button>
              </div>
              <div className="hero-card">
                <Placeholder />
                <button className="link" onClick={() => setShowAddingPatient(true)}>
                  Manage Patient Settings
                </button>
              </div>
            </div>
          </div>

          {/* --- APPROVALS CARD --- */}
          <div className="card approvals">
            <div className="card-title">Approval Request</div>
            {loading ? (
                <div className="big-num" style={{fontSize: '24px'}}>...</div>
            ) : (
                // DYNAMIC PENDING COUNT
                <div className="big-num">{pendingAppointments.length}</div> 
            )}
            <div className="muted">Request waiting to Approve</div>
            <button 
              className="btn ghost" 
              onClick={() => setShowAppointmentsModal(true)}
              disabled={loading || pendingAppointments.length === 0}
            >
              Review All ({pendingAppointments.length})
            </button>

            <div className="muted">Upcoming Appointments</div>
            {loading ? (
                <div className="big-num" style={{fontSize: '24px'}}>...</div>
            ) : (
                <div className="big-num">{upcomingAppointmentCount}</div>
            )}
            <button className="btn ghost" onClick={() => navigate("/schedule")}>More</button>
          </div>

          <div className="card appointments">
            <div className="card-title with-icon">
              <span>Today's Appointments</span>
            </div>
            <div className="appointments-content">
              <div className="huge-num">5</div>
              <div className="appt-list">
                <div className="appt highlight">
                  <div className="appt-name">Ken Drussi</div>
                  <div className="appt-row">
                    <div className="appt-title">Consultation</div>
                    <div className="appt-time">11:00 – 12:30</div>
                  </div>
                </div>
                <div className="appt">
                  <div className="appt-name">Sean Mendez</div>
                  <div className="appt-row">
                    <div className="appt-title">Tooth Cleaning</div>
                    <div className="appt-time">11:00 – 12:30</div>
                  </div>
                </div>
                <div className="appt">
                  <div className="appt-name">Sean Mendez</div>
                  <div className="appt-row">
                    <div className="appt-title">Full Dental Exam</div>
                    <div className="appt-time">11:00 – 12:30</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer-right">
              <button className="btn ghost" onClick={() => navigate("/schedule")}>
                More
              </button>
            </div>
          </div>

          <div className="card treatments">
            <div className="card-title with-icon">
              <span>Top Treatments</span>
            </div>
            {["Consultation","Scaling","Root Canal","Bleaching","Cosmetic"].map(t => (
              <StatPill key={t} label={t} />
            ))}
          </div>

          <div className="card totals">
            <div className="card-title with-icon">
              <span>Total Patients</span>
            </div>
            <div className="totals-content">
              <div className="muted">This month</div>
              <div className="big-num">135</div>
              <div className="muted">This year</div>
              <div className="big-num">2035</div>
            </div>
          </div>

        </section>

        {/* --- MODALS --- */}
        {showAppointmentsModal && (
          <AppointmentsModal 
              onClose={() => setShowAppointmentsModal(false)} 
              onUpdate={fetchDashboardData}
            />
        )}
        {showAddingPatient && (
          <AddingPatientModal onClose={() => setShowAddingPatient(false)} />
        )}
      </main>
    </div>
  );
};

export default MainDashboard;