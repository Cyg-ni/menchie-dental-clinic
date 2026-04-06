import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import "./Layout.css";
import "./ScheduleDashboard.css";
import ReportsModal from "./ReportsModal.jsx";
import logoImage from "./Images/logo.webp";

// ===============================================
// 1. FIREBASE SETUP & IMPORTS
// ===============================================
import { 
  collection, 
  onSnapshot, 
  query, 
  doc,         
  updateDoc,  
  Timestamp,
  getDocs,
  where,
  addDoc
} from 'firebase/firestore'; 
import { db } from '../../firebase';
import CalendarView from './AppointmentCalendar.jsx';
import { logActivity, getCurrentUserId } from '../../utils/activityLogger';

const appointmentsCol = collection(db, "appointments");

const DIRECT_FORM_INITIAL = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  age: '',
  address: '',
  gender: '',
  allergies: '',
  medications: '',
  conditionNotes: '',
  isPregnant: false,
  smokingStatus: false,
  serviceType: '',
};

const DIRECT_FORM_ERRORS_INITIAL = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  age: '',
};

function appointmentsSnapshotListener(callback) {
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


// 2. SERVICE DEFINITIONS
const SERVICE_DURATIONS = {
    'Routine Check-up & Cleaning': 60,   
    'Teeth Whitening (Cosmetic)': 90,    
    'Dental Implants Consultation': 120, 
    'Emergency Visit (Pain/Injury)': 60, 
    'Orthodontics Consultation': 60,     
    'Other / Not Sure': 30,
    'Align teeth': 60,
    'Apply Retainer': 45,
    'Dental Filling': 60,
    'tooth cleaning': 60,
    'tooth removal': 45,
    'teeth whitening': 90
};

const DIRECT_SCHEDULE_SERVICE_OPTIONS = [
  'Routine Check-up & Cleaning',
  'Teeth Whitening (Cosmetic)',
  'Dental Implants Consultation',
  'Emergency Visit (Pain/Injury)',
  'Orthodontics Consultation',
  'Other / Not Sure',
];

const SERVICE_COLOR_MAP = {
    'Routine Check-up & Cleaning': 'rep-green',
    'Teeth Whitening (Cosmetic)': 'rep-orange',
    'Dental Implants Consultation': 'rep-blue',
    'Emergency Visit (Pain/Injury)': 'rep-red',
    'Orthodontics Consultation': 'rep-orange',
    'Other / Not Sure': 'rep-maroon',
    'Align teeth': 'rep-orange',
    'Apply Retainer': 'rep-orange',
    'Dental Filling': 'rep-blue',
    'tooth cleaning': 'rep-green',
    'tooth removal': 'rep-red',
    'teeth whitening': 'rep-orange'
};


// Helper function to format total seconds into M:SS or X hr Y mins
const formatSecondsToQueueTime = (totalSeconds) => {
    if (totalSeconds <= 0) {
        return "Ready";
    }
    
    const totalMinutes = Math.ceil(totalSeconds / 60);
    
    if (totalMinutes < 6) { 
        const displayMinutes = Math.floor(totalSeconds / 60);
        const displaySeconds = totalSeconds % 60;
        return `${String(displayMinutes).padStart(1, '0')}:${String(displaySeconds).padStart(2, '0')}`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let parts = [];
    if (hours > 0) {
        parts.push(`${hours}hr`);
    }
    if (minutes > 0 || hours === 0) { 
        parts.push(`${minutes} mins`);
    }
    return parts.join(' ');
};

// Helper function to convert military time (HH:MM) to 12-hour format (H:MM AM/PM)
const formatMilitaryTo12Hour = (timeStr) => {
    if (!timeStr) return 'N/A';
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m); 
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Helper function to convert YYYY-MM-DD HH:MM to a local Date object
const getTimeObject = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute, 0); 
    } catch (e) {
        return null;
    }
};


// ===============================================
// ICON COMPONENTS
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
  const { currentUser } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(true);
  const [showReports, setShowReports] = useState(false);
  const menuRef = useRef(null);
  const pingAudioRef = useRef(null);
  const lastPingedAppointmentRef = useRef(null);

  // Date States (using fixed formatting)
  const todayISO = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO); 
  
  // Firebase State
  const [appointments, setAppointments] = useState([]); 
  
  // State for live time updates (runs interval)
  const [currentTime, setCurrentTime] = useState(Date.now()); 
  const [showOptionsForNext, setShowOptionsForNext] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBookedTimes, setRescheduleBookedTimes] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState('');
  const [selectedWaitingAppointmentId, setSelectedWaitingAppointmentId] = useState('');
  const [showDirectScheduleModal, setShowDirectScheduleModal] = useState(false);
  const [directScheduleDate, setDirectScheduleDate] = useState(todayISO);
  const [directScheduleBookedTimes, setDirectScheduleBookedTimes] = useState([]);
  const [directScheduleLoading, setDirectScheduleLoading] = useState(false);
  const [directScheduleSelectedSlot, setDirectScheduleSelectedSlot] = useState('');
  const [directScheduleForm, setDirectScheduleForm] = useState(DIRECT_FORM_INITIAL);
  const [directScheduleErrors, setDirectScheduleErrors] = useState(DIRECT_FORM_ERRORS_INITIAL);


  const formatDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  useEffect(() => {
    // 1. Firebase Listener Setup
    const unsubscribe = appointmentsSnapshotListener(setAppointments);
    
    // 2. Live Timer Setup
    // Update current time every 1 second (1000ms) for second-by-second countdown
    const timerId = setInterval(() => {
        setCurrentTime(Date.now());
    }, 1000); 

    // 3. Menu Cleanup
    const closeMenu = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(true); 
    };
    document.addEventListener("click", closeMenu);

    return () => {
      unsubscribe(); 
      clearInterval(timerId); // Clear timer on unmount
      document.removeEventListener("click", closeMenu);
    }
  }, []); 

  useEffect(() => {
    const pingAudio = new Audio('/ping.mp3');
    pingAudio.preload = 'auto';
    pingAudioRef.current = pingAudio;

    return () => {
      pingAudio.pause();
      pingAudioRef.current = null;
    };
  }, []);

  const playPingSound = async () => {
    const pingAudio = pingAudioRef.current;
    if (!pingAudio) return;

    try {
      pingAudio.currentTime = 0;
      await pingAudio.play();
    } catch (error) {
      console.warn('Ping sound playback blocked or failed:', error);
    }
  };

  // --- Serving Patient Tracker ---
  const servingPatient = useMemo(() => {
      // Find the one appointment that is currently marked as 'Serving'
      const serving = appointments.find(app => app.status?.isComplete === 'Serving');
      if (serving) {
          return {
              id: serving.id,
              name: serving.patientFullName || 'Patient',
              service: serving.serviceType,
              scheduledTime: formatMilitaryTo12Hour(serving.scheduledTime)
          };
      }
      return null;
  }, [appointments]);


  // --- Waiting Room Logic (Live Countdown Calculation) ---
  const waitingList = useMemo(() => {
    
    const isToday = selectedDate === todayISO;
    
    // 1. Filter and sort appointments
    const currentDayAppointments = appointments
        .filter(app => 
            // Only include scheduled/requested appointments AND those not yet served
            (app.status?.isScheduled === 'Scheduled' || app.status?.isScheduled === 'Appointment Requested') &&
            app.status?.isComplete !== 'Serving' && 
            app.status?.isComplete !== 'Complete' &&
            app.scheduledDate === selectedDate
        )
        .sort((a, b) => {
            const timeA = a.scheduledTime || '00:00';
            const timeB = b.scheduledTime || '00:00';
            if (timeA < timeB) return -1;
            if (timeA > timeB) return 1;
            return 0;
        });

    if (currentDayAppointments.length === 0) return [];

    
    let accumulatedDurationSeconds = 0; 
    
    // Calculate expected start time of the first appointment (reference point)
    const firstScheduledTime = getTimeObject(selectedDate, currentDayAppointments[0].scheduledTime);
    
    
    return currentDayAppointments.map((appt, index) => {
        
        const service = appt.serviceType || 'Other / Not Sure';
        const durationMinutes = SERVICE_DURATIONS[service] || SERVICE_DURATIONS['Other / Not Sure'];

        let queueTimeDisplay;

        if (!isToday || !firstScheduledTime) {
            // FUTURE DATE: Display scheduled time
            queueTimeDisplay = formatMilitaryTo12Hour(appt.scheduledTime);

        } else { 
            // TODAY: Live Countdown Logic
            
            if (index === 0) {
                // Patient 0: Nominal 4 minutes wait (240 seconds)
                const nominalWaitSeconds = 240; 
                
                // Calculate time elapsed since the scheduled start time of the FIRST patient
                const elapsedSinceFirstApptStart = (currentTime - firstScheduledTime.getTime());
                
                // Countdown from 4:00 relative to when the appt was supposed to start
                const nominalRemainingSeconds = nominalWaitSeconds - Math.floor(elapsedSinceFirstApptStart / 1000);
                 
                queueTimeDisplay = formatSecondsToQueueTime(Math.max(0, nominalRemainingSeconds));

            } else {
                // Patients > 0: Calculate Expected Start Time based on accumulated duration
                
                // Expected start time for *this* patient
                const expectedStartTimestamp = firstScheduledTime.getTime() + (accumulatedDurationSeconds * 1000); 
                
                // Time remaining until expected start (in seconds)
                const remainingSeconds = Math.ceil((expectedStartTimestamp - currentTime) / 1000);
            
                queueTimeDisplay = formatSecondsToQueueTime(remainingSeconds);
            }
        }
        
        // Accumulate the duration of the CURRENT patient's service (in SECONDS) for the NEXT patient
        accumulatedDurationSeconds += (durationMinutes * 60);

        return {
            name: appt.patientFullName || `Patient ${appt.id}`,
            queue: queueTimeDisplay,
            id: appt.id
        };
    });

  }, [appointments, selectedDate, currentTime, todayISO]); 


  // --- New: Handler to move patient to Serving status ---
  const handleStartServing = async () => {
    const waitingListPatients = waitingList;
    if (servingPatient) {
        alert(`${servingPatient.name} is already being served. Release them first.`);
        return;
    }
    
    if (waitingListPatients.length === 0) {
      alert("Waiting room is empty.");
      return;
    }

    const nextPatient = waitingListPatients[0];
    // Find the full appointment object in the main appointments list to get the ID
    const nextAppointmentObject = appointments.find(a => a.id === nextPatient.id);

    if (!nextAppointmentObject) return;

    try {
      const apptRef = doc(db, "appointments", nextAppointmentObject.id);
      
      await updateDoc(apptRef, {
        'status.isComplete': 'Serving', 
        updatedAt: Timestamp.fromDate(new Date()),
      });

      await playPingSound();

      console.log(`Patient ${nextPatient.name} marked as serving.`);

    } catch (error) {
      console.error("Error setting patient as serving:", error);
      alert("Failed to call patient. Check Firebase permissions.");
    }
  };
  
  // --- New: Handler to release patient from Serving status ---
  const handleReleasePatient = async () => {
      if (!servingPatient) {
          alert("No patient is currently being served.");
          return;
      }
      
      try {
          const apptRef = doc(db, "appointments", servingPatient.id);
          
          // We mark the status as Complete. 
          // Your getAppointmentHistory will now find this because the patientId hasn't changed.
          await updateDoc(apptRef, {
            'status.isComplete': 'Complete', 
            'status.isScheduled': 'Finished', // Optional: updates the scheduling status too
            'completedAt': Timestamp.fromDate(new Date()), // Precise time treatment ended
            'updatedAt': Timestamp.fromDate(new Date()),
          });

          console.log(`Patient ${servingPatient.name} marked as complete and added to history.`);
      } catch (error) {
          console.error("Error releasing patient:", error);
          alert("Failed to release patient. Check Firebase permissions.");
      }
  };

  // --- New: Drop appointment ---
  const handleDropAppointment = async () => {
    const selectedAppointment = actionTargetAppointment;
    if (!selectedAppointment) { alert('Please select an appointment from the waiting room first.'); return; }
    if (!confirm(`Drop appointment for ${selectedAppointment.patientFullName || 'patient'} on ${selectedAppointment.scheduledDate} at ${selectedAppointment.scheduledTime}?`)) return;
    try {
      const apptRef = doc(db, 'appointments', selectedAppointment.id);
      await updateDoc(apptRef, {
        'status.isScheduled': 'Cancelled',
        'status.isComplete': 'Cancelled',
        updatedAt: Timestamp.fromDate(new Date()),
      });

      const userId = getCurrentUserId();
      await logActivity(userId, 'Dropped an appointment', {
        appointmentId: selectedAppointment.id,
        patientName: selectedAppointment.patientFullName || 'Unknown Patient',
        scheduledDate: selectedAppointment.scheduledDate,
        scheduledTime: selectedAppointment.scheduledTime,
      });

      alert('Appointment dropped.');
    } catch (err) {
      console.error('Failed to drop appointment', err);
      alert('Failed to drop appointment.');
    }
  };

  // --- New: Reschedule appointment ---
  const handleRescheduleAppointment = async () => {
    const selectedAppointment = actionTargetAppointment;
    if (!selectedAppointment) { alert('Please select an appointment from the waiting room first.'); return; }
    setRescheduleDate(selectedAppointment.scheduledDate || '');
    setRescheduleTime(selectedAppointment.scheduledTime || '');
    setRescheduleSelectedSlot(selectedAppointment.scheduledTime || '');
    setShowRescheduleModal(true);
  };

  const fetchBookedSlotsForReschedule = async (dateString) => {
    setRescheduleLoading(true);
    setRescheduleBookedTimes([]);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('scheduledDate', '==', dateString),
        where('status.isScheduled', '==', 'Scheduled')
      );
      const snapshot = await getDocs(q);
      const booked = snapshot.docs.map(d => d.data().scheduledTime);
      setRescheduleBookedTimes(booked);
    } catch (err) {
      console.error('Error fetching booked slots for reschedule', err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  React.useEffect(() => {
    if (showRescheduleModal && rescheduleDate) {
      fetchBookedSlotsForReschedule(rescheduleDate);
    }
  }, [showRescheduleModal, rescheduleDate]);

  const handleConfirmReschedule = async () => {
    const selectedAppointment = actionTargetAppointment;
    if (!selectedAppointment) { alert('No appointment to reschedule.'); return; }
    if (!rescheduleDate || !(rescheduleSelectedSlot || rescheduleTime)) { alert('Please choose date and time.'); return; }
    const chosenTime = rescheduleSelectedSlot || rescheduleTime;
    const newTimeObj = getTimeObject(rescheduleDate, chosenTime);
    if (!newTimeObj || isNaN(newTimeObj.getTime())) { alert('Invalid date/time.'); return; }
    if (newTimeObj.getTime() < Date.now()) { alert('Cannot reschedule to a past time. Please choose a future slot.'); return; }
    try {
      const previousDate = selectedAppointment.scheduledDate;
      const previousTime = selectedAppointment.scheduledTime;

      const apptRef = doc(db, 'appointments', selectedAppointment.id);
      await updateDoc(apptRef, {
        scheduledDate: rescheduleDate,
        scheduledTime: chosenTime,
        updatedAt: Timestamp.fromDate(new Date()),
      });

      const userId = getCurrentUserId();
      await logActivity(userId, 'Rescheduled an appointment', {
        appointmentId: selectedAppointment.id,
        patientName: selectedAppointment.patientFullName || 'Unknown Patient',
        previousScheduledDate: previousDate,
        previousScheduledTime: previousTime,
        newScheduledDate: rescheduleDate,
        newScheduledTime: chosenTime,
      });

      setShowRescheduleModal(false);
      setOptionsOpen(false);
      alert('Appointment rescheduled.');
    } catch (err) {
      console.error('Failed to reschedule', err);
      alert('Failed to reschedule appointment.');
    }
  };

  const openDirectScheduleModal = () => {
    setDirectScheduleDate(todayISO);
    setDirectScheduleSelectedSlot('');
    setDirectScheduleForm(DIRECT_FORM_INITIAL);
    setDirectScheduleErrors(DIRECT_FORM_ERRORS_INITIAL);
    setShowDirectScheduleModal(true);
  };

  const validateDirectField = (fieldName, fieldValue) => {
    const trimmedValue = String(fieldValue || '').trim();

    if (fieldName === 'firstName') {
      if (!trimmedValue) return 'First name is required.';
      if (trimmedValue.length < 2) return 'First name must be at least 2 characters.';
      if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmedValue)) return 'First name must contain letters only.';
      return '';
    }

    if (fieldName === 'lastName') {
      if (!trimmedValue) return 'Last name is required.';
      if (trimmedValue.length < 2) return 'Last name must be at least 2 characters.';
      if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmedValue)) return 'Last name must contain letters only.';
      return '';
    }

    if (fieldName === 'age') {
      if (!trimmedValue) return 'Age is required.';
      const numericAge = Number(trimmedValue);
      if (!Number.isInteger(numericAge)) return 'Age must be a whole number.';
      if (numericAge < 1 || numericAge > 120) return 'Age must be between 1 and 120.';
      return '';
    }

    if (fieldName === 'email') {
      if (!trimmedValue) return '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) return 'Please enter a valid email address.';
      return '';
    }

    if (fieldName === 'phone') {
      if (!trimmedValue) return '';
      if (!/^\+?[0-9\s()-]{7,20}$/.test(trimmedValue)) return 'Please enter a valid phone number.';
      return '';
    }

    return '';
  };

  const validateDirectForm = () => {
    const nextErrors = {
      firstName: validateDirectField('firstName', directScheduleForm.firstName),
      lastName: validateDirectField('lastName', directScheduleForm.lastName),
      age: validateDirectField('age', directScheduleForm.age),
      email: validateDirectField('email', directScheduleForm.email),
      phone: validateDirectField('phone', directScheduleForm.phone),
    };

    setDirectScheduleErrors(nextErrors);
    return Object.values(nextErrors).every((message) => !message);
  };

  const handleDirectFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    let normalizedValue = value;

    if (name === 'firstName' || name === 'lastName') {
      // Block numbers/symbols while typing: allow letters, spaces, apostrophes, and hyphens only.
      normalizedValue = value.replace(/[^A-Za-z\s'-]/g, '').slice(0, 50);
    } else if (name === 'age') {
      // Age accepts digits only.
      normalizedValue = value.replace(/[^\d]/g, '').slice(0, 3);
    } else if (name === 'phone') {
      // Phone accepts common phone characters only.
      normalizedValue = value.replace(/[^0-9+()\s-]/g, '').slice(0, 20);
    }

    setDirectScheduleForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : normalizedValue,
    }));

    if (type !== 'checkbox' && Object.prototype.hasOwnProperty.call(DIRECT_FORM_ERRORS_INITIAL, name)) {
      const validationError = validateDirectField(name, normalizedValue);
      setDirectScheduleErrors((prev) => ({ ...prev, [name]: validationError }));
    }
  };

  const fetchBookedSlotsForDirect = async (dateString) => {
    setDirectScheduleLoading(true);
    setDirectScheduleBookedTimes([]);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('scheduledDate', '==', dateString),
        where('status.isScheduled', '==', 'Scheduled')
      );
      const snapshot = await getDocs(q);
      const booked = snapshot.docs.map((d) => d.data().scheduledTime).filter(Boolean);
      setDirectScheduleBookedTimes(booked);
    } catch (err) {
      console.error('Error fetching booked slots for direct scheduling', err);
    } finally {
      setDirectScheduleLoading(false);
    }
  };

  React.useEffect(() => {
    if (showDirectScheduleModal && directScheduleDate) {
      fetchBookedSlotsForDirect(directScheduleDate);
    }
  }, [showDirectScheduleModal, directScheduleDate]);

  const handleDirectScheduleSubmit = async () => {
    const isFormValid = validateDirectForm();
    if (!isFormValid) {
      alert('Please correct the highlighted patient details.');
      return;
    }

    if (!String(directScheduleForm.serviceType || '').trim() || !directScheduleDate || !directScheduleSelectedSlot) {
      alert('Please choose a Service, Date, and Time Slot.');
      return;
    }

    const dateTimeObj = getTimeObject(directScheduleDate, directScheduleSelectedSlot);
    if (!dateTimeObj || Number.isNaN(dateTimeObj.getTime())) {
      alert('Invalid appointment date or time.');
      return;
    }

    if (dateTimeObj.getTime() <= Date.now()) {
      alert('The selected appointment time is already past. Please choose a future slot.');
      return;
    }

    if (directScheduleBookedTimes.includes(directScheduleSelectedSlot)) {
      alert('This time slot is already booked. Please choose another slot.');
      return;
    }

    try {
      const patientName = `${directScheduleForm.firstName.trim()} ${directScheduleForm.lastName.trim()}`.trim();
      const allergyList = directScheduleForm.allergies
        ? directScheduleForm.allergies.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
      const medicationsList = directScheduleForm.medications
        ? directScheduleForm.medications.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

      const patientPayload = {
        name: patientName,
        phone_num: directScheduleForm.phone.trim(),
        contactInfo: directScheduleForm.email.trim() || 'N/A',
        age: directScheduleForm.age ? Number(directScheduleForm.age) : null,
        address: directScheduleForm.address.trim() || 'N/A',
        gender: directScheduleForm.gender || 'N/A',
        isPregnant: directScheduleForm.isPregnant,
        smokingStatus: directScheduleForm.smokingStatus,
        medicalHistory: {
          Allergies: allergyList,
          conditionNotes: directScheduleForm.conditionNotes.trim() || '',
          currentMedications: medicationsList,
        },
        updated: new Date().toISOString().slice(0, 10),
      };

      const patientRef = await addDoc(collection(db, 'patients'), patientPayload);

      const appointmentPayload = {
        patientId: patientRef.id,
        patientFullName: patientName,
        patientEmail: directScheduleForm.email.trim() || '',
        phone_num: directScheduleForm.phone.trim(),
        serviceType: directScheduleForm.serviceType,
        scheduledDate: directScheduleDate,
        scheduledTime: directScheduleSelectedSlot,
        dateTime: Timestamp.fromDate(dateTimeObj),
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        status: {
          isPending: 'Not Pending',
          isScheduled: 'Scheduled',
          isComplete: 'Pending',
          trackingNote: 'Directly scheduled by staff.',
        },
      };

      const appointmentRef = await addDoc(collection(db, 'appointments'), appointmentPayload);

      const userId = getCurrentUserId();
      await logActivity(userId, 'Created direct scheduled appointment', {
        appointmentId: appointmentRef.id,
        patientId: patientRef.id,
        patientName,
        scheduledDate: directScheduleDate,
        scheduledTime: directScheduleSelectedSlot,
        serviceType: directScheduleForm.serviceType,
      });

      setShowDirectScheduleModal(false);
      alert('Appointment is successful');
    } catch (error) {
      console.error('Error creating direct appointment', error);
      alert('Failed to schedule appointment. Please try again.');
    }
  };

  // --- Reports and Calendar Logic ---
  
  // Create a memoized list of only scheduled appointments for reports/calendar shading
  const scheduledAppointments = useMemo(() => {
      return appointments.filter(app => app.status?.isScheduled === 'Scheduled');
  }, [appointments]);


  const serviceCategories = [
    { label: "Check-up & Cleaning", key: "Routine Check-up & Cleaning", color: "#8EE08E", kind: "cleaning" },
    { label: "Teeth Whitening", key: "Teeth Whitening (Cosmetic)", color: "#FFA64D", kind: "exams" },
    { label: "Dental Implants", key: "Dental Implants Consultation", color: "#77D2FF", kind: "consultations" },
    { label: "Emergency Visit", key: "Emergency Visit (Pain/Injury)", color: "#FF6B6B", kind: "surgeries" },
    { label: "Orthodontics Consult", key: "Orthodontics Consultation", color: "#A78BFA", kind: "exams" },
    { label: "Other / Not Sure", key: "Other / Not Sure", color: "#800000", kind: "consultations" },
  ];
  
  const dailyAppointmentCounts = useMemo(() => {
    const counts = {};
    const appointmentsOnSelectedDay = scheduledAppointments.filter(app => app.scheduledDate === selectedDate);
    serviceCategories.forEach(cat => { counts[cat.key] = 0; });
    appointmentsOnSelectedDay.forEach(app => {
        const service = app.serviceType;
        if (counts.hasOwnProperty(service)) {
            counts[service] = (counts[service] || 0) + 1;
        } else {
             counts['Other / Not Sure'] = (counts['Other / Not Sure'] || 0) + 1;
        }
    });
    return counts;
  }, [scheduledAppointments, selectedDate]);


  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startWeekDay = startOfMonth.getDay();

  // Updated: Appointment Map tracks all unique service types for each day
  const appointmentColorMap = useMemo(() => {
    const map = {};
    
    const appointmentsByDay = {};
    scheduledAppointments.forEach(app => {
        const dateStr = app.scheduledDate; 
        if (dateStr) {
            const dateParts = dateStr.split('-');
            const year = Number(dateParts[0]);
            const month = Number(dateParts[1]) - 1; 
            const day = Number(dateParts[2]);

            if (year === viewDate.getFullYear() && month === viewDate.getMonth()) {
                if (!appointmentsByDay[day]) {
                    appointmentsByDay[day] = [];
                }
                appointmentsByDay[day].push(app);
            }
        }
    });

    Object.keys(appointmentsByDay).forEach(day => {
        const dayAppts = appointmentsByDay[day];
        
        // Get unique service types for this day
        const uniqueServices = [...new Set(dayAppts.map(a => a.serviceType || 'Other / Not Sure'))];
        
        // Get colors for each unique service
        const serviceColors = uniqueServices.map(service => {
            const category = serviceCategories.find(cat => cat.key === service);
            return category ? category.color : '#D3D3D3';
        });
        
        map[day] = serviceColors;
    });
    
    return map;
  }, [scheduledAppointments, viewDate, serviceCategories]);


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

  const displayNotifications = scheduledAppointments.slice(0, 4).map(app => ({
      title: `${app.serviceType} Scheduled`,
      time: formatMilitaryTo12Hour(app.scheduledTime),
      date: app.scheduledDate,
  }));
  
  const waiting = waitingList; 

  // Compute whether Start/Release actions are allowed based on appointment datetime
  const nextAppointmentObject = useMemo(() => {
    if (!waitingList || waitingList.length === 0) return null;
    return appointments.find(a => a.id === waitingList[0].id) || null;
  }, [waitingList, appointments]);

  const actionTargetAppointment = useMemo(() => {
    if (!selectedWaitingAppointmentId) return nextAppointmentObject;
    return appointments.find((a) => a.id === selectedWaitingAppointmentId) || nextAppointmentObject;
  }, [selectedWaitingAppointmentId, appointments, nextAppointmentObject]);

  useEffect(() => {
    if (!waitingList || waitingList.length === 0) {
      setSelectedWaitingAppointmentId('');
      return;
    }

    const stillExists = waitingList.some((item) => item.id === selectedWaitingAppointmentId);
    if (!stillExists) {
      setSelectedWaitingAppointmentId(waitingList[0].id);
    }
  }, [waitingList, selectedWaitingAppointmentId]);

  const canStart = useMemo(() => {
    if (!nextAppointmentObject) return false;
    // only allow start when appointment date is today and current time >= scheduled time
    if (nextAppointmentObject.scheduledDate !== todayISO) return false;
    const apptTimeObj = getTimeObject(nextAppointmentObject.scheduledDate, nextAppointmentObject.scheduledTime);
    if (!apptTimeObj) return false;
    return currentTime >= apptTimeObj.getTime();
  }, [nextAppointmentObject, currentTime, todayISO]);

  const servingAppointmentObject = useMemo(() => {
    if (!servingPatient) return null;
    return appointments.find(a => a.id === servingPatient.id) || null;
  }, [servingPatient, appointments]);

  const canRelease = useMemo(() => {
    if (!servingAppointmentObject) return false;
    if (servingAppointmentObject.scheduledDate !== todayISO) return false;
    const apptTimeObj = getTimeObject(servingAppointmentObject.scheduledDate, servingAppointmentObject.scheduledTime);
    if (!apptTimeObj) return false;
    return currentTime >= apptTimeObj.getTime();
  }, [servingAppointmentObject, currentTime, todayISO]);

  useEffect(() => {
    if (servingPatient || !canStart || !nextAppointmentObject) return;
    if (lastPingedAppointmentRef.current === nextAppointmentObject.id) return;

    lastPingedAppointmentRef.current = nextAppointmentObject.id;
    playPingSound();
  }, [servingPatient, canStart, nextAppointmentObject]);


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
          <div className="avatar" style={{ backgroundImage: currentUser?.profilePictureUrl ? `url(${currentUser.profilePictureUrl})` : 'none', backgroundSize: 'cover' }} />
          <div className="user-meta">
            <div className="user-name">{currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username : "Loading..."}</div>
            <div className="user-role">{currentUser?.role ? currentUser.role.replace('_', ' ').toUpperCase() : "..."}</div>
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
                <button className="direct-schedule-btn" onClick={openDirectScheduleModal}>Direct Schedule</button>
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
                    const cellDateStr = formatDate(cell.date);
                    
                    if (cellDateStr === todayISO) classes.push('today'); 
                    if (cellDateStr === selectedDate) classes.push('selected-day');

                    // Get colors for this day
                    const dayColors = cell.inMonth && appointmentColorMap[dayNumber] ? appointmentColorMap[dayNumber] : [];
                    
                    // Create gradient background if multiple colors
                    let dayStyle = {};
                    if (dayColors.length > 0) {
                      if (dayColors.length === 1) {
                        dayStyle.background = dayColors[0] + '40'; // Add transparency
                      } else {
                        // Create a repeating linear gradient for multiple colors
                        const gradientColors = dayColors.map((color, idx) => `${color}60 ${(idx / dayColors.length) * 100}%, ${color}60 ${((idx + 1) / dayColors.length) * 100}%`).join(', ');
                        dayStyle.background = `linear-gradient(45deg, ${gradientColors})`;
                      }
                    }

                    return (
                      <div 
                        className={classes.join(" ")} 
                        style={dayStyle}
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

              {/* RENDER DYNAMIC WAITING LIST */}
              <div className="waiting-list">
                {waiting.length === 0 ? (
                    <div className="waiting-row"><div className="left" style={{color: '#888'}}>No patients scheduled for this day.</div></div>
                ) : (
                    waiting.map((w, i) => (
                      <div
                        className={`waiting-row waiting-selectable ${selectedWaitingAppointmentId === w.id ? 'selected-waiting-row' : ''}`}
                        key={w.id || i}
                        onClick={() => setSelectedWaitingAppointmentId(w.id)}
                      >
                            <div className="left">
                                <div className="avatar" />
                                <div>{w.name}</div>
                            </div>
                            <div className="queue">{w.queue}</div>
                        </div>
                    ))
                )}
              </div>
            </section>

            <section className="card serving-card">
              <div className="section-head"><div>Serving Now</div></div>
              <div className="serving-body">
                
                {servingPatient ? (
                    <>
                        <div className="serving-text">Serving: <b>{servingPatient.name}</b></div>
                        <div className="serving-details">{servingPatient.service} at {servingPatient.scheduledTime}</div>
                          <button className="start-btn release-btn" onClick={(e)=>{
                            if (!canRelease) { e.preventDefault(); alert('Cannot release patient until their scheduled time and date.'); return; }
                            handleReleasePatient();
                          }} disabled={!canRelease}>
                            Release & Complete
                          </button>
                    </>
                ) : (
                    <>
                        <div className="serving-text">
                            {/* Determine the next patient to display */}
                            {waiting.length > 0 ? 
                                <span>Next: <b>{waiting[0].name}</b></span> : 
                                <span>Queue is empty.</span>
                            }
                        </div>
                        <div className="options-wrap">
                          <button className={`start-btn ${!canStart ? 'not-scheduled' : ''}`} onClick={(e)=>{
                            if (!canStart) { e.preventDefault(); alert('Cannot start serving until the appointment date and scheduled time.'); return; }
                            handleStartServing();
                          }} disabled={!canStart}>
                            {canStart ? 'Start' : 'Not Appointed Schedule'}
                          </button>

                          <button className="options-btn" title="Options" onClick={()=> setOptionsOpen(o => !o)}>⚙</button>

                          {optionsOpen && (
                            <div className="options-menu">
                              <button className="menu-item" onClick={()=>{ setOptionsOpen(false); handleDropAppointment(); }}>Drop Appointment</button>
                              <button className="menu-item" onClick={()=>{ setOptionsOpen(false); handleRescheduleAppointment(); }}>Reschedule Appointment</button>
                            </div>
                          )}
                        </div>
                        {actionTargetAppointment && (
                          <div className="selected-appointment-hint">
                            Selected for actions: <b>{actionTargetAppointment.patientFullName || 'Patient'}</b>
                          </div>
                        )}
                    </>
                )}
                
              </div>
            </section>

          </div>
        </section>

        {showReports && 
            <ReportsModal 
                onClose={() => setShowReports(false)}
                appointments={scheduledAppointments}
                displayDate={viewDate}
            />
        }

        {showRescheduleModal && (
          <div className="reschedule-overlay">
            <div className="reschedule-modal">
              <h4>Reschedule Appointment</h4>
              <div style={{marginBottom:8}}><b>{actionTargetAppointment?.patientFullName || 'Patient'}</b></div>
              <div style={{marginBottom:12}}>
                <CalendarView
                  selectedDate={rescheduleDate}
                  onDateSelect={(d)=>{ setRescheduleDate(d); setRescheduleSelectedSlot(''); }}
                  bookedTimes={rescheduleBookedTimes}
                  loading={rescheduleLoading}
                  onSlotSelect={(slot)=> setRescheduleSelectedSlot(slot)}
                  selectedSlot={rescheduleSelectedSlot}
                />
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={()=>setShowRescheduleModal(false)}>Cancel</button>
                <button className="btn primary" onClick={handleConfirmReschedule}>Confirm</button>
              </div>
            </div>
          </div>
        )}

        {showDirectScheduleModal && (
          <div className="reschedule-overlay" onClick={() => setShowDirectScheduleModal(false)}>
            <div className="direct-schedule-modal" onClick={(e) => e.stopPropagation()}>
              <div className="direct-schedule-header">
                <h3>Schedule Appointment</h3>
                <button className="modal-close" onClick={() => setShowDirectScheduleModal(false)}>×</button>
              </div>

              <div className="direct-schedule-grid">
                <section className="direct-schedule-panel">
                  <h4>Patient Information</h4>

                  <div className="inline-inputs">
                    <div>
                      <input className={directScheduleErrors.firstName ? 'input-invalid' : ''} name="firstName" value={directScheduleForm.firstName} onChange={handleDirectFormChange} placeholder="First Name *" />
                      {directScheduleErrors.firstName && <div className="field-error">{directScheduleErrors.firstName}</div>}
                    </div>
                    <div>
                      <input className={directScheduleErrors.lastName ? 'input-invalid' : ''} name="lastName" value={directScheduleForm.lastName} onChange={handleDirectFormChange} placeholder="Last Name *" />
                      {directScheduleErrors.lastName && <div className="field-error">{directScheduleErrors.lastName}</div>}
                    </div>
                  </div>

                  <div>
                    <input className={directScheduleErrors.email ? 'input-invalid' : ''} name="email" value={directScheduleForm.email} onChange={handleDirectFormChange} placeholder="Email Address (Optional)" />
                    {directScheduleErrors.email && <div className="field-error">{directScheduleErrors.email}</div>}
                  </div>

                  <div className="inline-inputs">
                    <div>
                      <input className={directScheduleErrors.phone ? 'input-invalid' : ''} name="phone" value={directScheduleForm.phone} onChange={handleDirectFormChange} placeholder="Phone Number (Optional)" />
                      {directScheduleErrors.phone && <div className="field-error">{directScheduleErrors.phone}</div>}
                    </div>
                    <div>
                      <input className={directScheduleErrors.age ? 'input-invalid' : ''} name="age" type="text" inputMode="numeric" value={directScheduleForm.age} onChange={handleDirectFormChange} placeholder="Age *" />
                      {directScheduleErrors.age && <div className="field-error">{directScheduleErrors.age}</div>}
                    </div>
                  </div>

                  <input name="address" value={directScheduleForm.address} onChange={handleDirectFormChange} placeholder="Home Address" />

                  <select name="gender" value={directScheduleForm.gender} onChange={handleDirectFormChange}>
                    <option value="">Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>

                  <hr />

                  <h4>Medical History</h4>
                  <input name="allergies" value={directScheduleForm.allergies} onChange={handleDirectFormChange} placeholder="Allergies (comma separated)" />
                  <input name="medications" value={directScheduleForm.medications} onChange={handleDirectFormChange} placeholder="Current Medications (comma separated)" />
                  <textarea name="conditionNotes" value={directScheduleForm.conditionNotes} onChange={handleDirectFormChange} placeholder="Medical Condition Notes" rows={3} />

                  <div className="inline-checks">
                    <label><input type="checkbox" name="isPregnant" checked={directScheduleForm.isPregnant} onChange={handleDirectFormChange} /> Tick if Pregnant</label>
                    <label><input type="checkbox" name="smokingStatus" checked={directScheduleForm.smokingStatus} onChange={handleDirectFormChange} /> Tick if Smoker</label>
                  </div>
                </section>

                <section className="direct-schedule-panel">
                  <h4>Schedule Your Visit</h4>

                  <label className="field-label">Select Service</label>
                  <select name="serviceType" value={directScheduleForm.serviceType} onChange={handleDirectFormChange}>
                    <option value="">-- Choose a Service --</option>
                    {DIRECT_SCHEDULE_SERVICE_OPTIONS.map((service) => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>

                  <CalendarView
                    selectedDate={directScheduleDate}
                    onDateSelect={(dateValue) => {
                      setDirectScheduleDate(dateValue);
                      setDirectScheduleSelectedSlot('');
                    }}
                    bookedTimes={directScheduleBookedTimes}
                    loading={directScheduleLoading}
                    onSlotSelect={(slot) => setDirectScheduleSelectedSlot(slot)}
                    selectedSlot={directScheduleSelectedSlot}
                  />

                  <button className="direct-submit-btn" onClick={handleDirectScheduleSubmit}>Schedule Appointment</button>
                </section>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ScheduleDashboard;

// Reschedule modal root element rendering (placed at end so it's included in this file)