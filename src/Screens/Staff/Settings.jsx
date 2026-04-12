import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useCurrentUser } from "../../hooks/useCurrentUser";
import "./Layout.css";
import "./Settings.css";
import logoImage from "./Images/logo.webp";
import CalendarView, { TIME_SLOTS } from "./AppointmentCalendar.jsx";
import { applyAccessibilityPreferences } from "../../utils/accessibilityPreferences";

const EMPTY_PROFILE_IMAGE = "/empty%20profile.jpg";
const CLINIC_SETTINGS_DOC = doc(db, "clinicConfig", "scheduleSettings");

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
    fullName: "Loading...",
    email: "loading@example.com",
    phone: "Calculating...",
    role: "Staff",
    bio: "",
  },
  clinic: {
    timezone: "Asia/Manila",
    workWeek: "monday-friday",
    startHour: "08:00",
    endHour: "18:00",
    autoAssign: true,
    defaultChair: "Chair A",
    scheduleBlocks: [],
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
  const [blockDate, setBlockDate] = useState("");
  const [blockTime, setBlockTime] = useState("all-day");
  const [blockReason, setBlockReason] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const { currentUser: currentUserData } = useCurrentUser();

  useEffect(() => {
    if (currentUserData) {
      setSettings(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          fullName: `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || currentUserData.username,
          email: currentUserData.email || prev.profile.email,
          phone: currentUserData.mobileNumber || currentUserData.phone || prev.profile.phone,
          role: currentUserData.role || prev.profile.role,
          bio: currentUserData.bio || prev.profile.bio,
        }
      }));
    }
  }, [currentUserData]);

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

  useEffect(() => {
    const loadClinicSettings = async () => {
      try {
        const snapshot = await getDoc(CLINIC_SETTINGS_DOC);
        if (!snapshot.exists()) return;

        const remote = snapshot.data() || {};
        setSettings((prev) => ({
          ...prev,
          clinic: {
            ...prev.clinic,
            timezone: remote.timezone || prev.clinic.timezone,
            workWeek: remote.workWeek || prev.clinic.workWeek,
            startHour: remote.startHour || prev.clinic.startHour,
            endHour: remote.endHour || prev.clinic.endHour,
            scheduleBlocks: Array.isArray(remote.scheduleBlocks) ? remote.scheduleBlocks : prev.clinic.scheduleBlocks,
          },
        }));
      } catch (error) {
        console.warn("Could not load clinic schedule settings:", error);
      }
    };

    loadClinicSettings();
  }, []);

  useEffect(() => {
    const persistClinicSettings = async () => {
      try {
        await setDoc(
          CLINIC_SETTINGS_DOC,
          {
            timezone: settings.clinic.timezone,
            workWeek: settings.clinic.workWeek,
            startHour: settings.clinic.startHour,
            endHour: settings.clinic.endHour,
            scheduleBlocks: settings.clinic.scheduleBlocks || [],
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn("Failed to persist clinic settings:", error);
      }
    };

    persistClinicSettings();
  }, [
    settings.clinic.timezone,
    settings.clinic.workWeek,
    settings.clinic.startHour,
    settings.clinic.endHour,
    settings.clinic.scheduleBlocks,
  ]);

  // Accessibility: Apply high contrast, large text, reduce motion
  useEffect(() => {
    applyAccessibilityPreferences(settings.accessibility);
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

  const addScheduleBlock = () => {
    if (!blockDate) {
      alert("Please choose a date to block.");
      return;
    }

    const normalizedReason = blockReason.trim();
    const candidate = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      date: blockDate,
      time: blockTime,
      reason: normalizedReason,
      createdAt: new Date().toISOString(),
    };

    const duplicateExists = (settings.clinic.scheduleBlocks || []).some(
      (entry) => entry.date === candidate.date && entry.time === candidate.time
    );

    if (duplicateExists) {
      alert("This date/time is already blocked.");
      return;
    }

    updateSetting("clinic", "scheduleBlocks", [...(settings.clinic.scheduleBlocks || []), candidate]);
    setBlockReason("");
  };

  const getBlockedTimesForDate = (dateString) => {
    if (!dateString) return [];
    return (settings.clinic.scheduleBlocks || [])
      .filter((entry) => entry.date === dateString && entry.time && entry.time !== "all-day")
      .map((entry) => entry.time);
  };

  const getBlockedDates = () => {
    return (settings.clinic.scheduleBlocks || [])
      .filter((entry) => entry.time === "all-day")
      .map((entry) => entry.date);
  };

  const removeScheduleBlock = (blockId) => {
    updateSetting(
      "clinic",
      "scheduleBlocks",
      (settings.clinic.scheduleBlocks || []).filter((entry) => entry.id !== blockId)
    );
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
          <img src={logoImage} alt="Menchie's Dental Clinic Logo" className="brand-logo" />
          <div className="brand-name">Menchie's Dental Clinic</div>
        </div>

        <div className="user">
          <div className="avatar" style={{ backgroundImage: `url(${currentUserData?.profilePictureUrl || EMPTY_PROFILE_IMAGE})` }} />
          <div className="user-meta">
            <div className="user-name">{settings.profile.fullName}</div>
            <div className="user-role">{settings.profile.role && settings.profile.role.replace('_', ' ').toUpperCase()}</div>
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
            </header>
            <div className="form-grid two-col">
              <label className="form-control">
                <span>Full Name</span>
                <input
                  type="text"
                  value={settings.profile.fullName}
                  readOnly
                  className="readonly-input"
                />
              </label>
              <label className="form-control">
                <span>Role / Title</span>
                <input
                  type="text"
                  value={settings.profile.role}
                  readOnly
                  className="readonly-input"
                />
              </label>
              <label className="form-control">
                <span>Work Email</span>
                <input
                  type="email"
                  value={settings.profile.email}
                  readOnly
                  className="readonly-input"
                />
              </label>
              <label className="form-control">
                <span>Direct Line</span>
                <input
                  type="tel"
                  value={settings.profile.phone}
                  readOnly
                  className="readonly-input"
                />
              </label>
              <label className="form-control full">
                <span>About / Handoff Notes</span>
                <textarea
                  rows={3}
                  value={settings.profile.bio}
                  onChange={(event) => {
                    const newValue = event.target.value;
                    updateSetting("profile", "bio", newValue);
                    
                    // Save bio to Firestore if logged in
                    const userId = localStorage.getItem("staffUserId");
                    if (userId) {
                      updateDoc(doc(db, "users", userId), { bio: newValue })
                        .catch(err => console.error("Error updating bio:", err));
                    }
                  }}
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

            <div className="clinic-signout">
              <div className="clinic-signout-copy">
                <h3>Sign out</h3>
                <p>Quickly log out from this device.</p>
              </div>
              <button type="button" className="ghost-btn" onClick={handleLogout}>
                Logout and return to login
              </button>
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

          <article className="settings-card schedule-block-card">
            <header className="card-head">
              <div>
                <h2>Schedule Blocking</h2>
                <p>Choose a date directly from the calendar and block the whole day or a specific slot.</p>
              </div>
            </header>

            <div className="schedule-blocking">
              <div className="schedule-blocking-calendar-wrap">
                <CalendarView
                  selectedDate={blockDate}
                  onDateSelect={(dateValue) => {
                    setBlockDate(dateValue);
                  }}
                  bookedTimes={[]}
                  blockedTimes={getBlockedTimesForDate(blockDate)}
                  blockedDates={getBlockedDates()}
                  onSlotSelect={(slot) => setBlockTime(slot)}
                  selectedSlot={blockTime === "all-day" ? "" : blockTime}
                />
              </div>

              <div className="block-actions">
                <button
                  type="button"
                  className={`block-mode-btn ${blockTime === "all-day" ? "active" : ""}`}
                  onClick={() => setBlockTime("all-day")}
                >
                  All day
                </button>
                {TIME_SLOTS.map((slot) => (
                  <button
                    type="button"
                    key={slot}
                    className={`block-mode-btn ${blockTime === slot ? "active" : ""}`}
                    onClick={() => setBlockTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              <label className="form-control full">
                <span>Reason (Optional)</span>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  placeholder="Conference, leave, emergency"
                />
              </label>

              <button type="button" className="ghost-btn" onClick={addScheduleBlock}>Add Block</button>

              <div className="block-list">
                {(settings.clinic.scheduleBlocks || []).length === 0 ? (
                  <div className="block-empty">No blocked schedules yet.</div>
                ) : (
                  [...settings.clinic.scheduleBlocks]
                    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                    .map((entry) => (
                      <div key={entry.id} className="block-item">
                        <div>
                          <div className="block-main">{entry.date} • {entry.time === 'all-day' ? 'All day' : entry.time}</div>
                          {entry.reason ? <div className="block-reason">{entry.reason}</div> : null}
                        </div>
                        <button type="button" className="block-remove" onClick={() => removeScheduleBlock(entry.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Settings;

