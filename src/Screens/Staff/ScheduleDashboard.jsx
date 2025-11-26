import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Layout.css";
import "./ScheduleDashboard.css";
import ReportsModal from "./ReportsModal.jsx";

// ===============================================
// 1. FIREBASE SETUP & IMPORTS (Self-Contained)
// ===============================================
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  getDocs 
} from 'firebase/firestore'; 

// *** REPLACE THIS CONFIG WITH YOUR ACTUAL PROJECT CONFIGURATION ***
const firebaseConfig = {
  apiKey: "AIzaSyCS-olCQRpJZGcYSGWG7CZ8PIpV-wBNaOE",
  authDomain: "menchie-dental-clinic.firebaseapp.com",
  projectId: "menchie-dental-clinic",
  storageBucket: "menchie-dental-clinic.firebasestorage.app",
  messagingSenderId: "1005995383687",
  appId: "1:1005995383687:web:42301faf7bbfcb544b1122",
  measurementId: "G-C96BVD0XY6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection Reference
const appointmentsCol = collection(db, "appointments");

// Helper function equivalent to onAppointmentsSnapshot from firebase.js
function appointmentsSnapshotListener(callback) {
  // We use a simple query to fetch all appointments for the dashboard view
  const q = query(appointmentsCol); 
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    }));
    callback(data);
  });
}
// ===============================================


// ===============================================
// ICON COMPONENTS (Unchanged)
// ===============================================

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

const ReportIcon = ({ kind }) => {
  switch (kind) {
    case "exams": 
      return (
        <svg width="28" height="28" fill="none" stroke="#FFF" strokeWidth="2.2">
          <circle cx="11" cy="11" r="6" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      );

    case "surgeries": 
      return (
        <svg width="28" height="28" fill="none" stroke="#FFF" strokeWidth="2.2">
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
          <line x1="12" y1="11" x2="12" y2="15" />
          <line x1="10" y1="13" x2="14" y2="13" />
        </svg>
      );

    case "consultations":
      return (
        <svg width="28" height="28" fill="none" stroke="#FFF" strokeWidth="2.2">
          <rect x="3" y="4" width="18" height="14" rx="3" />
          <path d="M7 18l3-3" />
        </svg>
      );

    case "cleaning": 
      return (
        <svg width="28" height="28" fill="none" stroke="#FFF" strokeWidth="2.2">
          <rect x="6" y="10" width="12" height="8" rx="2" />
          <line x1="9" y1="10" x2="9" y2="6" />
          <line x1="15" y1="10" x2="15" y2="6" />
        </svg>
      );

    default:
      return null;
  }
};

const IconTile = ({ color, label, kind, count = 0 }) => (
  <div className="report-tile">
    <div className="tile-icon" style={{ backgroundColor: color }}>
      <ReportIcon kind={kind} />
      <span className="tile-count">{count}</span> 
    </div>
    <div className="tile-label">{label}</div>
  </div>
);


// ===============================================
// SCHEDULE DASHBOARD COMPONENT
// ===============================================

const ScheduleDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(true);
  const [showReports, setShowReports] = useState(false);
  const menuRef = useRef(null);

  // Date States
  const [viewDate, setViewDate] = useState(new Date());
  const todayISO = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayISO); 
  
  // Firebase State
  const [appointments, setAppointments] = useState([]); 

  const formatDate = (dateObj) => dateObj.toISOString().slice(0, 10);


  useEffect(() => {
    // Setup Firebase real-time listener using the local helper
    const unsubscribe = appointmentsSnapshotListener(setAppointments);
    
    // Cleanup for menu toggle (using original logic)
    const closeMenu = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(true); 
    };
    document.addEventListener("click", closeMenu);

    return () => {
      unsubscribe(); // Cleanup the Firestore listener
      document.removeEventListener("click", closeMenu);
    }
  }, []); 

  // --- Service Definitions for Reports ---
  const serviceCategories = [
    { label: "Check-up & Cleaning", key: "Routine Check-up & Cleaning", color: "#8EE08E", kind: "cleaning" },
    { label: "Teeth Whitening", key: "Teeth Whitening (Cosmetic)", color: "#FFA64D", kind: "exams" },
    { label: "Dental Implants", key: "Dental Implants Consultation", color: "#77D2FF", kind: "consultations" },
    { label: "Emergency Visit", key: "Emergency Visit (Pain/Injury)", color: "#FF6B6B", kind: "surgeries" },
    { label: "Orthodontics Consult", key: "Orthodontics Consultation", color: "#FFC3A0", kind: "exams" },
    { label: "Other / Not Sure", key: "Other / Not Sure", color: "#D3D3D3", kind: "consultations" },
  ];
  
  // --- Calculate Daily Appointment Counts (Memoized for performance) ---
  const dailyAppointmentCounts = useMemo(() => {
    const counts = {};
    const appointmentsOnSelectedDay = appointments.filter(app => 
        app.scheduledDate === selectedDate
    );

    serviceCategories.forEach(cat => {
        counts[cat.key] = 0;
    });

    appointmentsOnSelectedDay.forEach(app => {
        const service = app.serviceType;
        if (counts.hasOwnProperty(service)) {
            counts[service] = (counts[service] || 0) + 1;
        } else {
             counts['Other / Not Sure'] = (counts['Other / Not Sure'] || 0) + 1;
        }
    });

    return counts;
  }, [appointments, selectedDate]);


  // --- Calendar Day Shading (Memoized) ---
  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startWeekDay = startOfMonth.getDay();

  const appointmentMap = useMemo(() => {
    const map = {};
    appointments.forEach(app => {
        const dateStr = app.scheduledDate; 
        if (dateStr) {
            const dateParts = dateStr.split('-');
            const year = Number(dateParts[0]);
            const month = Number(dateParts[1]) - 1; 
            const day = Number(dateParts[2]);

            if (year === viewDate.getFullYear() && month === viewDate.getMonth()) {
                map[day] = 'rep-blue'; 
            }
        }
    });
    return map;
  }, [appointments, viewDate]);


  // 4. Generate Weeks/Days
  const weeks = [];
  let day = 1 - startWeekDay;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day++);
      week.push({
        date: dateObj,
        inMonth: dateObj.getMonth() === viewDate.getMonth(),
      });
    }
    weeks.push(week);
  }

  const monthFormatter = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  });

  // Notifications display (pulling from the first 4 appointments)
  const displayNotifications = appointments.slice(0, 4).map(app => ({
      title: `${app.serviceType} Scheduled`,
      time: app.scheduledTime || 'N/A', 
      date: app.scheduledDate,
  }));
  
  const waiting = [
    { name: "Juan Cruz", queue: "4 mins" },
    { name: "Allan Gabe", queue: "30 mins" },
    { name: "Josh Ariz", queue: "1hr 20 mins" },
    { name: "Teo Steph", queue: "1hr 50 mins" },
  ];


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
        <section className="schedule-grid">
          <div className="row-top">

            <section className="card calendar-card">
              <div className="section-head">
                <div>Appointments</div>
              </div>

              <div className="calendar-bar">
                <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>‹</button>
                <div className="month">{monthFormatter.format(viewDate)}</div>
                <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>›</button>
              </div>

              <div className="weekday-row">
                {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((w) => (
                  <div className="weekday" key={w}>{w}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {weeks.map((week, wi) =>
                  week.map((cell, di) => {
                    const classes = ["day"];
                    if (!cell.inMonth) classes.push("dim");
                    
                    const dayNumber = cell.date.getDate();
                    if (cell.inMonth && appointmentMap[dayNumber]) classes.push(appointmentMap[dayNumber]);
                    
                    const cellDateStr = formatDate(cell.date);
                    if (cellDateStr === selectedDate) classes.push('selected-day');

                    return (
                      <div 
                        className={classes.join(" ")} 
                        key={`${wi}-${di}`}
                        onClick={() => {
                          if (cell.inMonth) {
                             setSelectedDate(cellDateStr);
                          }
                        }}
                      >
                        <span className="num">{cell.date.getDate()}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="card reports-card">
              <div className="section-head">
                <div>Appointments for: {selectedDate}</div>
                <button className="see-all btn-link" onClick={() => setShowReports(true)}>
                  See All
                </button>
              </div>

              <div className="reports-grid">
                {serviceCategories.map((cat) => (
                    <IconTile 
                        key={cat.key}
                        color={cat.color} 
                        label={cat.label} 
                        kind={cat.kind} 
                        count={dailyAppointmentCounts[cat.key]} 
                    />
                ))}
              </div>
            </section>

          </div>

          <div className="row-bottom">

            <section className="card notifications-card">
              <div className="section-head">
                <div>Notifications</div>
                <div className="see-all">View All</div>
              </div>

              <div className="notifs">
                {displayNotifications.map((n, i) => (
                  <div className="notif-row" key={i}>
                    <div className="notif-dot" />
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-time">{n.time}</div>
                    <div className="notif-date">{n.date}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card waiting-card">
              <div className="section-head">
                <div>Waiting Room</div>
                <div className="see-all" />
              </div>

              <div className="waiting-header">
                <div>Patient</div>
                <div>Queue Time</div>
              </div>

              <div className="waiting-list">
                {waiting.map((w, i) => (
                  <div className="waiting-row" key={i}>
                    <div className="left">
                      <div className="avatar" />
                      <div>{w.name}</div>
                    </div>
                    <div className="queue">{w.queue}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card serving-card">
              <div className="section-head"><div>Serving Now</div></div>
              <div className="serving-body">
                <div className="serving-text">Click Start to begin calling patients</div>
                <button className="start-btn" onClick={() => {
                  // Play ping sound
                  const audio = new window.Audio('/ping.mp3');
                  audio.play();
                  // Notify next patient (placeholder logic)
                  if (waiting && waiting.length > 0) {
                    alert(`Notifying next patient: ${waiting[0].name}`);
                  }
                }}>Start</button>
              </div>
            </section>

          </div>
        </section>

        {showReports && <ReportsModal onClose={() => setShowReports(false)} />}

      </main>
    </div>
  );
};

export default ScheduleDashboard;