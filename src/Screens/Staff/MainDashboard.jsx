import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase"; 
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit } from 'firebase/firestore'; 

import "./MainDashboard.css";
import "./Layout.css";
import AppointmentsModal from "./AppointmentsModal.jsx";
import AddingPatientModal from "./AddingPatientModal.jsx";
import logoImage from "./Images/logo.webp";
import patientImage from "./Images/patienticon.png";

// Define collection references
const appointmentsCollectionRef = collection(db, "appointments");
const patientsCollectionRef = collection(db, "patients");

// --- UTILITY COMPONENTS ---
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

// --- Helper Functions ---
const SERVICE_DURATIONS = {
    'Routine Check-up & Cleaning': 60,   
    'Teeth Whitening (Cosmetic)': 90,    
    'Dental Implants Consultation': 120, 
    'Emergency Visit (Pain/Injury)': 60, 
    'Orthodontics Consultation': 60,     
    'Other / Not Sure': 30               
};

const formatTimeAndDuration = (timeStr, serviceType) => {
    if (!timeStr) return 'N/A';
    
    const [h, m] = timeStr.split(':').map(Number);
    const startObj = new Date(2000, 0, 1, h, m); 
    const startTime12hr = startObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const durationMinutes = SERVICE_DURATIONS[serviceType] || 30;

    const endMs = startObj.getTime() + durationMinutes * 60000;
    const endObj = new Date(endMs);
    const endTime12hr = endObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return `${startTime12hr} – ${endTime12hr}`;
};

const formatDateForDisplay = (dateInput) => {
    if (!dateInput) return 'N/A';
    
    let date;
    if (dateInput && dateInput.toDate) {
        date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
        date = new Date(dateInput + 'T00:00:00'); 
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        return 'Invalid Date';
    }

    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
  const [topServices, setTopServices] = useState([]); 
  const [patientCounts, setPatientCounts] = useState({ month: 0, year: 0 }); 
  const [todaysAppointments, setTodaysAppointments] = useState([]); 
  const [recentPatients, setRecentPatients] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Get today's date in YYYY-MM-DD format for Firestore querying
  const todayISO = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
  
  // --- Data Fetching Functions ---

  // Helper to extract the best available name from a patient document (data)
  const getBestPatientName = (data) => {
      const constructedName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      if (constructedName) return constructedName;

      if (data.medicalHistory?.currentMedications?.name) {
          return data.medicalHistory.currentMedications.name;
      }
      
      // 3. Fallback to a readable ID
      if (data.id) {
          return `Patient ID: ${data.id.substring(0, 8)}`;
      }

      return 'Name N/A';
  };

  // Helper to fetch full patient name from ID
  const getPatientFullName = useCallback(async (patientIdRef) => {
    if (!patientIdRef) return "Unknown Patient";
    const patientID = patientIdRef.includes('/') ? patientIdRef.split('/').pop() : patientIdRef;
    const patientRef = doc(db, "patients", patientID);
    try {
        const snap = await getDoc(patientRef);
        if (snap.exists()) {
            const data = snap.data();
            // Use the comprehensive name logic here too, just in case
            return getBestPatientName({ ...data, id: patientID }); 
        }
    } catch (e) {
        console.error("Error fetching patient name:", e);
    }
    return `Patient ID: ${patientID}`;
  }, []);


  // FIX: Fetches Recent Appointments (Activity) instead of Recent Patients
  const getRecentPatients = useCallback(async () => {
    try {
      // 1. Query appointments sorted by last update time (most recent activity)
      const q = query(
        appointmentsCollectionRef,
        orderBy("updatedAt", "desc"), // Using 'updatedAt' from appointment record
        limit(10) // Fetch more than 5 to deduplicate client-side
      );
      
      const snapshot = await getDocs(q);
      const rawAppts = snapshot.docs.map(doc => doc.data());
      
      const recentPatientsMap = {};
      
      for (const appt of rawAppts) {
          // Use patientFullName from appointment record (most reliable source shown)
          const name = appt.patientFullName || 'Name N/A'; 
          
          // Use appointment ID as a unique key for the activity log
          const activityId = appt.id || appt.patientId;
          
          // Deduplicate by name, only keep the newest entry for that patient
          if (name !== 'Name N/A' && !recentPatientsMap[name]) {
              recentPatientsMap[name] = {
                  id: activityId,
                  name: name,
                  // Use the update/create date of the appointment
                  date: appt.updatedAt || appt.createdAt || new Date().toISOString().slice(0, 10),
              };
          }
      }

      const finalRecentList = Object.values(recentPatientsMap)
          .slice(0, 5); // Limit to top 5 unique patients

      setRecentPatients(finalRecentList);
      return finalRecentList;

    } catch (error) {
      console.error("Error fetching recent activity for patients:", error);
      return [];
    }
  }, []);


  // --- Existing Fetch Functions ---

  const getTodaysAppointments = useCallback(async () => {
    try {
      const q = query(
        appointmentsCollectionRef,
        where("scheduledDate", "==", todayISO),
        where("status.isScheduled", "==", "Scheduled")
      );
      const snapshot = await getDocs(q);
      
      let appts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      appts.sort((a, b) => {
          const timeA = a.scheduledTime || '00:00';
          const timeB = b.scheduledTime || '00:00';
          if (timeA < timeB) return -1;
          if (timeA > timeB) return 1;
          return 0;
      });
      
      const apptsWithNames = await Promise.all(appts.map(async (appt) => {
          // Use patientFullName directly from appointment record if available
          if (appt.patientFullName) return appt; 
          const fullName = await getPatientFullName(appt.patientId);
          return { ...appt, patientFullName: fullName };
      }));
      
      setTodaysAppointments(apptsWithNames);
      return apptsWithNames.length;

    } catch (error) {
      console.error("Error fetching today's appointments:", error);
      return 0;
    }
  }, [todayISO, getPatientFullName]);


  const getPatientCounts = useCallback(async () => {
    try {
        const data = await getDocs(patientsCollectionRef);
        const patients = data.docs.map(doc => doc.data());
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); 

        let countMonth = 0;
        let countYear = 0;

        patients.forEach(p => {
            let createdDate = null;
            if (p.createdAt && p.createdAt.toDate) {
                createdDate = p.createdAt.toDate();
            } else if (p.updated) {
                 createdDate = new Date(p.updated + 'T00:00:00'); 
            } else if (p.createdAt) {
                createdDate = new Date(p.createdAt);
            }

            if (createdDate && !isNaN(createdDate.getTime())) {
                const patientYear = createdDate.getFullYear();
                const patientMonth = createdDate.getMonth();
                
                if (patientYear === currentYear) { countYear++; }
                if (patientYear === currentYear && patientMonth === currentMonth) { countMonth++; }
            }
        });

        setPatientCounts({ month: countMonth, year: countYear });
        return { month: countMonth, year: countYear };
        
    } catch (error) {
        console.error("Error fetching patient counts:", error);
        return { month: 0, year: 0 };
    }
  }, []);


  const getTopServices = useCallback(async () => {
    try {
        const data = await getDocs(appointmentsCollectionRef);
        const frequencyMap = {};
        data.docs.forEach(doc => {
            const service = doc.data().serviceType;
            if (service) { frequencyMap[service] = (frequencyMap[service] || 0) + 1; }
        });

        const sortedServices = Object.entries(frequencyMap)
            .map(([serviceName, count]) => ({ serviceName, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5) 

        setTopServices(sortedServices);
        return sortedServices;

    } catch (error) {
        console.error("Error fetching top services:", error);
        return [];
    }
  }, []); 

  const getPendingAppointments = useCallback(async () => {
    try {
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
            
            if (apptData.dateTime && apptData.dateTime.toDate) {
                const apptTimestamp = apptData.dateTime.toDate().getTime();
                
                if (apptTimestamp > now) {
                    futureCount++;
                }
            }
        });
        
        const totalUpcoming = futureCount;
        setUpcomingAppointmentCount(totalUpcoming);
        return totalUpcoming;

    } catch (error) {
        console.error("Error fetching upcoming appointments:", error);
        return 0;
    }
  }, [todayISO]); 

  
  const fetchDashboardData = useCallback(async () => {
      setLoading(true);
      
      await Promise.all([
          getPendingAppointments(),
          getUpcomingAppointments(),
          getTopServices(),
          getPatientCounts(),
          getTodaysAppointments(),
          getRecentPatients()
      ]);
      
      setLoading(false);
      
  }, [getPendingAppointments, getUpcomingAppointments, getTopServices, getPatientCounts, getTodaysAppointments, getRecentPatients]);


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
          <img src={logoImage} alt="Menchie's Dental Clinic Logo" className="brand-logo" />
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
                {loading && <li className="list-item"><div className="item-meta">Loading recent patients...</div></li>}
                {!loading && recentPatients.length === 0 && (
                    <li className="list-item"><div className="item-meta">No recent patients found.</div></li>
                )}
                
                {!loading && recentPatients.map(p => (
                    <li className="list-item" key={p.id}>
                        <div className="avatar small" />
                        <div className="item-meta">
                            <div className="item-title">{p.name || 'Name Unknown'}</div> 
                            {/* Display formatted date */}
                            <div className="item-sub">{formatDateForDisplay(p.date)}</div> 
                        </div>
                        <button className="chev">›</button>
                    </li>
                ))}
            </ul>
          </div>

          <div className="card hero">
            <div className="section-title">
              <span style={{fontSize: '26px'}}className="muted">Good Morning,</span> <span style={{fontSize: '26px',color: '#A78BFA'}}>Juana</span>
              <div className="hero-card">
                <img src={patientImage} alt="Patient-Icon" className="patient-icon" />
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
              <div className="huge-num">{todaysAppointments.length}</div>
              
              {loading ? (
                <div className="appt-list" style={{paddingTop: '10px', color: '#888'}}>Loading appointments...</div>
              ) : todaysAppointments.length === 0 ? (
                <div className="appt-list" style={{paddingTop: '10px', color: '#888'}}>No scheduled appointments today.</div>
              ) : (
                <div className="appt-list">
                  {todaysAppointments.slice(0, 3).map((appt, i) => (
                    <div className={`appt ${i === 0 ? 'highlight' : ''}`} key={appt.id}>
                        <div className="appt-name">{appt.patientFullName || 'Patient'}</div>
                        <div className="appt-row">
                            <div className="appt-title">{appt.serviceType || 'Service N/A'}</div>
                            <div className="appt-time">{formatTimeAndDuration(appt.scheduledTime, appt.serviceType)}</div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- TOP TREATMENTS CARD --- */}
          <div className="card treatments">
            <div className="card-title with-icon">
              <span>Top Services</span>
            </div>
            {loading && <div style={{padding: '10px', textAlign: 'center', color: '#888'}}>Loading services...</div>}
            
            {!loading && topServices.length === 0 && (
                <div style={{padding: '10px', textAlign: 'center', color: '#888'}}>No service data available.</div>
            )}

            {!loading && topServices.length > 0 && (
                topServices.map(service => (
                    // Label shows the service name and the count (e.g., "Consultation (15)")
                    <StatPill key={service.serviceName} label={`${service.serviceName} (${service.count})`} />
                ))
            )}
          </div>

          {/* --- TOTAL PATIENTS CARD --- */}
          <div className="card totals">
            <div className="card-title with-icon">
              <span>Total Patients</span>
            </div>
            <div className="totals-content">
              <div>
                <div className="muted">This month</div>
                {loading ? (
                    <div className="big-num" style={{fontSize: '24px'}}>...</div>
                ) : (
                    <div className="big-num">{patientCounts.month}</div>
                )}
              </div>
              
              <div>
                <div className="muted">This year</div>
                {loading ? (
                    <div className="big-num" style={{fontSize: '24px'}}>...</div>
                ) : (
                    <div className="big-num">{patientCounts.year}</div>
                )}
              </div>            </div>
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