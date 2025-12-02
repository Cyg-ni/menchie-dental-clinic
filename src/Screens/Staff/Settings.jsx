import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Layout.css";
import "./Settings.css";

const Icon = ({ name }) => {
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

const STORAGE_KEY = "mdc-settings";

const DEFAULT_SETTINGS = {
  profile: {
    fullName: "Juana Cruz",
    email: "juana.cruz@menchieclinic.com",
    phone: "+63 912 345 6789",
    role: "Chief Dentist",
    bio: "Primary contact for clinical operations.",
  },
  clinic: {
    timezone: "Asia/Manila",
    workWeek: "monday-friday",
    startHour: "08:00",
    endHour: "18:00",
    autoAssign: true,
    defaultChair: "Chair A",
  },
  notifications: {
    email: true,
    sms: false,
    push: true,
    dailyDigest: true,
    criticalAlerts: true,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: true,
  },
  security: {
    twoFactor: true,
    idleTimeout: 20,
    deviceApprovals: false,
  },
  integrations: {
    imagingSync: true,
    ehrSync: false,
    autoBackup: true,
    retention: 24,
  },
};

const hydrateSettings = (stored) => {
  const safe = stored && typeof stored === "object" ? stored : {};
  const mergeSection = (sectionName) => ({
    ...DEFAULT_SETTINGS[sectionName],
    ...(safe[sectionName] || {}),
  });
  return {
    profile: mergeSection("profile"),
    clinic: mergeSection("clinic"),
    notifications: mergeSection("notifications"),
    accessibility: mergeSection("accessibility"),
    security: mergeSection("security"),
    integrations: mergeSection("integrations"),
  };
};

const loadSettings = () => {
  if (typeof window === "undefined") return hydrateSettings();
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return hydrateSettings(stored);
  } catch (error) {
    console.warn("Failed to load settings:", error);
    return hydrateSettings();
  }
};

const Toggle = ({ label, description, checked, onChange, id }) => (
  <label className="toggle" htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className="toggle-slider" aria-hidden />
    <div className="toggle-meta">
      <span className="toggle-label">{label}</span>
      {description && <span className="toggle-description">{description}</span>}
    </div>
  </label>
);

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(true);
  const [settings, setSettings] = useState(() => loadSettings());
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) setMenuOpen(true);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setStatusMessage("All changes saved");
    const timeout = setTimeout(() => setStatusMessage(""), 2500);
    return () => clearTimeout(timeout);
  }, [settings]);

  // Accessibility: Apply high contrast, large text, reduce motion
  useEffect(() => {
    const root = document.documentElement;
    if (settings.accessibility.highContrast) {
      root.style.setProperty('--contrast', '#222');
      root.style.setProperty('--background', '#fff');
    } else {
      root.style.removeProperty('--contrast');
      root.style.removeProperty('--background');
    }
    if (settings.accessibility.largeText) {
      root.style.fontSize = '118%';
    } else {
      root.style.fontSize = '';
    }
    if (settings.accessibility.reduceMotion) {
      root.style.setProperty('scroll-behavior', 'auto');
      root.style.setProperty('transition', 'none');
    } else {
      root.style.removeProperty('scroll-behavior');
      root.style.removeProperty('transition');
    }
  }, [settings.accessibility]);

  useEffect(() => {
    if (settings.notifications.push) {
      // subscribeToPushNotifications();
    } else {
      // unsubscribeFromPushNotifications();
    }
    // Similar logic can be added for email and sms
  }, [settings.notifications]);

  const updateSetting = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      ["mdc-settings", "patients", "currentUser", "authToken"].forEach((key) => window.localStorage.removeItem(key));
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="dashboard settings-page">
      <header className="topbar" ref={menuRef}>
        <button
          className="icon-btn menu-toggle"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
            ≡
        </button>

        <div className="brand-left">
          <div className="brand-logo" />
          <div className="brand-name">Dr. Menchie Amor Dangla Dental Clinic</div>
        </div>

        <div className="user">
          <div className="avatar" />
          <div className="user-meta">
            <div className="user-name">{settings.profile.fullName}</div>
            <div className="user-role">{settings.profile.role}</div>
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

      <main className="main settings-main">
        <section className="settings-header">
          <div>
            <p className="eyebrow">Control Center</p>
            <h1>Settings</h1>
            <p className="subtitle">Configure account, clinic operations, alerts, and integrations in one place.</p>
          </div>
          <div className="status-chip" aria-live="polite">
            {statusMessage || "Idle"}
          </div>
        </section>

        <section className="settings-grid">
          <article className="settings-card stretch">
            <header className="card-head">
              <div>
                <h2>Profile & Account</h2>
                <p>Update the details that appear to staff and patients.</p>
              </div>
              <button className="ghost-btn" type="button">Sync Staff Directory</button>
            </header>
            <div className="form-grid two-col">
              <label className="form-control">
                <span>Full Name</span>
                <input
                  type="text"
                  value={settings.profile.fullName}
                  onChange={(event) => updateSetting("profile", "fullName", event.target.value)}
                />
              </label>
              <label className="form-control">
                <span>Role / Title</span>
                <input
                  type="text"
                  value={settings.profile.role}
                  onChange={(event) => updateSetting("profile", "role", event.target.value)}
                />
              </label>
              <label className="form-control">
                <span>Work Email</span>
                <input
                  type="email"
                  value={settings.profile.email}
                  onChange={(event) => updateSetting("profile", "email", event.target.value)}
                />
              </label>
              <label className="form-control">
                <span>Direct Line</span>
                <input
                  type="tel"
                  value={settings.profile.phone}
                  onChange={(event) => updateSetting("profile", "phone", event.target.value)}
                />
              </label>
              <label className="form-control full">
                <span>About / Handoff Notes</span>
                <textarea
                  rows={3}
                  value={settings.profile.bio}
                  onChange={(event) => updateSetting("profile", "bio", event.target.value)}
                />
              </label>
            </div>
          </article>

          <article className="settings-card">
            <header className="card-head">
              <div>
                <h2>Clinic Preferences</h2>
                <p>Hours, automations, and chair routing for appointments.</p>
              </div>
            </header>
            <div className="form-grid two-col">
              <label className="form-control">
                <span>Timezone</span>
                <select
                  value={settings.clinic.timezone}
                  onChange={(event) => updateSetting("clinic", "timezone", event.target.value)}
                >
                  <option value="Asia/Manila">GMT+8 — Manila</option>
                  <option value="Asia/Singapore">GMT+8 — Singapore</option>
                  <option value="Asia/Tokyo">GMT+9 — Tokyo</option>
                  <option value="Australia/Sydney">GMT+10 — Sydney</option>
                </select>
              </label>
              <label className="form-control">
                <span>Work Week</span>
                <select
                  value={settings.clinic.workWeek}
                  onChange={(event) => updateSetting("clinic", "workWeek", event.target.value)}
                >
                  <option value="monday-friday">Monday – Friday</option>
                  <option value="tuesday-saturday">Tuesday – Saturday</option>
                  <option value="full-week">Full Week</option>
                </select>
              </label>
              <label className="form-control">
                <span>Start of Day</span>
                <input
                  type="time"
                  value={settings.clinic.startHour}
                  onChange={(event) => updateSetting("clinic", "startHour", event.target.value)}
                />
              </label>
              <label className="form-control">
                <span>End of Day</span>
                <input
                  type="time"
                  value={settings.clinic.endHour}
                  onChange={(event) => updateSetting("clinic", "endHour", event.target.value)}
                />
              </label>
            </div>
          </article>

          <article className="settings-card">
            <header className="card-head">
              <div>
                <h2>Notification Center</h2>
                <p>Choose how you’d like to be notified.</p>
              </div>
            </header>
            <div className="stack">
              <Toggle
                id="notif-email"
                label="Email alerts"
                description="New appointments, cancellations, escalations."
                checked={settings.notifications.email}
                onChange={(value) => updateSetting("notifications", "email", value)}
              />
              <Toggle
                id="notif-sms"
                label="SMS reminders"
                description="Only urgent or off-hours alerts."
                checked={settings.notifications.sms}
                onChange={(value) => updateSetting("notifications", "sms", value)}
              />
              <Toggle
                id="notif-push"
                label="Push notifications"
                description="Real-time mentions and patient updates."
                checked={settings.notifications.push}
                onChange={(value) => updateSetting("notifications", "push", value)}
              />
            </div>
          </article>

          <article className="settings-card">
            <header className="card-head">
              <div>
                <h2>Accessibility & Display</h2>
                <p>Make the dashboard easier to consume for long shifts.</p>
              </div>
            </header>
            <div className="stack">
              <Toggle
                id="access-contrast"
                label="High contrast mode"
                description="Boosts contrast and badge borders."
                checked={settings.accessibility.highContrast}
                onChange={(value) => updateSetting("accessibility", "highContrast", value)}
              />
              <Toggle
                id="access-text"
                label="Large text"
                description="Increase base font size by 18%."
                checked={settings.accessibility.largeText}
                onChange={(value) => updateSetting("accessibility", "largeText", value)}
              />
              <Toggle
                id="access-motion"
                label="Reduce motion"
                description="Removes dashboard transition animations."
                checked={settings.accessibility.reduceMotion}
                onChange={(value) => updateSetting("accessibility", "reduceMotion", value)}
              />
            </div>
          </article>

          <article className="settings-card logout-card">
            <header className="card-head">
              <div>
                <h2>Sign out</h2>
                <p>Log out of the clinic console on this device.</p>
              </div>
            </header>
            <p className="logout-copy">
              You’ll immediately return to the secure login screen. We’ll also clear local data such as cached patient lists and preferences so that the next staff member can sign in safely.
            </p>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout and return to login
            </button>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Settings;

