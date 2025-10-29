import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MainDashboard.css";
import "./ScheduleDashboard.css";
import ReportsModal from "./ReportsModal.jsx";

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
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="6"/>
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      );
    case "surgeries":
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="7" width="18" height="12" rx="2"/>
          <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>
          <line x1="12" y1="11" x2="12" y2="15" />
          <line x1="10" y1="13" x2="14" y2="13" />
        </svg>
      );
    case "consultations":
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="14" rx="3"/>
          <path d="M7 18l3-3"/>
        </svg>
      );
    case "cleaning":
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="6" y="10" width="12" height="8" rx="2"/>
          <line x1="9" y1="10" x2="9" y2="6" />
          <line x1="15" y1="10" x2="15" y2="6" />
        </svg>
      );
    default:
      return null;
  }
};

const IconTile = ({ color, label, kind }) => (
  <div className="report-tile">
    <div className="tile-icon" style={{ backgroundColor: color }}>
      <ReportIcon kind={kind} />
    </div>
    <div className="tile-label">{label}</div>
  </div>
);

const ScheduleDashboard = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [viewDate, setViewDate] = useState(new Date());
  const [showReports, setShowReports] = useState(false);
  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startWeekDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();
  // Stable per-month pseudo-random for shaded report dates
  const seed = viewDate.getFullYear() * 100 + viewDate.getMonth();
  let prng = seed;
  const rand = () => {
    prng = (prng * 1664525 + 1013904223) % 4294967296;
    return prng / 4294967296;
  };
  const shadedMap = new Map();
  const totalShaded = 6; // number of shaded days to show
  const colorKeys = ["rep-orange", "rep-red", "rep-blue", "rep-green"];
  for (let i = 0; i < totalShaded; i++) {
    const d = 1 + Math.floor(rand() * daysInMonth);
    const key = `${viewDate.getFullYear()}-${viewDate.getMonth()}-${d}`;
    shadedMap.set(key, colorKeys[i % colorKeys.length]);
  }

  const weeks = [];
  {
    let day = 1 - startWeekDay; // start from previous month's tail
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        week.push({
          date: dateObj,
          inMonth: dateObj.getMonth() === viewDate.getMonth(),
          dow: d,
        });
        day++;
      }
      weeks.push(week);
    }
  }

  const monthFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
  const notifications = [
    { title: "New Consultation Approved", time: "8:20 am", date: "Oct 3, 2025" },
    { title: "New Dental Surgery Scheduled", time: "11:40 am", date: "Oct 3, 2025" },
    { title: "Dental Exam Scheduled", time: "12:20 pm", date: "Oct 3, 2025" },
    { title: "New Appointment Approved", time: "1:00 pm", date: "Oct 2, 2025" },
  ];

  const waiting = [
    { name: "Juan Cruz", queue: "4 mins" },
    { name: "Allan Gabe", queue: "30 mins" },
    { name: "Josh Ariz", queue: "1hr 20 mins" },
    { name: "Teo Steph", queue: "1hr 50 mins" },
  ];

  return (
    <div className="dashboard">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button className="icon-btn" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>≡</button>
        </div>
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
          <button className="nav-item" aria-label="Patients">
            <Icon name="patients" />
          </button>
          <button className="nav-item" aria-label="Settings">
            <Icon name="settings" />
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="brand-left">
            <div className="brand-logo" />
            <div className="brand-name">Menchie's Dental Clinic</div>
          </div>
          <div />
        </header>

        <section className="schedule">
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
            {weeks.map((week, wi) => (
              <React.Fragment key={wi}>
                {week.map((cell, di) => {
                  const today = new Date();
                  const isToday = cell.date.toDateString() === today.toDateString();
                  const classes = ["day"]; 
                  if (!cell.inMonth) classes.push("dim");
                  // Shade random in-month dates using report colors
                  if (cell.inMonth) {
                    const k = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
                    const shade = shadedMap.get(k);
                    if (shade) classes.push(shade);
                  }
                  return (
                    <div className={classes.join(" ")} key={`${wi}-${di}`}>
                      <span className="num">{cell.date.getDate()}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="card reports-card">
          <div className="section-head">
            <div>Reports</div>
            <button className="see-all btn-link" onClick={() => setShowReports(true)}>See All</button>
          </div>
          <div className="reports-grid">
            <IconTile color="#FFA64D" label="Dental Exams" kind="exams" />
            <IconTile color="#FF6B6B" label="Surgeries" kind="surgeries" />
            <IconTile color="#77D2FF" label="Consultations" kind="consultations" />
            <IconTile color="#8EE08E" label="Tooth Cleaning" kind="cleaning" />
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
            {notifications.map((n, i) => (
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
            <button className="start-btn">Start</button>
          </div>
        </section>
      </div>
        </section>
        {showReports && (
          <ReportsModal onClose={() => setShowReports(false)} />
        )}
      </main>
    </div>
  );
};

export default ScheduleDashboard;


