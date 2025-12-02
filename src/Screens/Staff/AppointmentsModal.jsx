import React, { useState, useEffect, useCallback } from "react";
import "./AppointmentsModal.css";

// ===============================================
// 1. FIREBASE SETUP & IMPORTS
// ===============================================
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    doc, 
    updateDoc, 
    query, 
    where, 
    getDoc,
    getDocs,
    Timestamp 
} from 'firebase/firestore'; 

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
const appointmentsCollectionRef = collection(db, "appointments");
// ===============================================

// --- 2. TIME SLOTS CONSTANT ---
const TIME_SLOTS = [
    "08:30", "09:45", "11:00", "13:00", 
    "14:30", "15:45", "17:00",
];

// --- 3. HELPER FUNCTION: GET DAYS IN MONTH ---
const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

// --- HELPER: FORMAT DATE LOCAL (Fixes the "One Day Behind" bug) ---
const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- 4. CALENDAR VIEW COMPONENT ---
const CalendarView = ({ selectedDate, onDateSelect, bookedTimes, loading }) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    // Calculate first day of month. 
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); 
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    // Monday-start logic: (Sun=0 -> 6, Mon=1 -> 0, etc.)
    const startDay = (firstDayOfMonth + 6) % 7; 

    const dateCells = [];
    // Pad empty cells
    for (let i = 0; i < startDay; i++) {
        dateCells.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Render days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        
        // FIX: Use local string formatting instead of ISO
        const dateString = formatDateLocal(date);
        const todayString = formatDateLocal(today);

        const isToday = dateString === todayString;
        const isSelected = dateString === selectedDate;
        
        // Note: To gray out an entire day based on bookings, 
        // you would need to fetch availability for the whole month here.
        // For now, the CSS class 'fully-booked' is ready if you add that logic.
        const isFullyBooked = false; 

        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (isSelected) dayClass += ' selected';
        if (isFullyBooked) dayClass += ' fully-booked';
        
        dateCells.push(
            <div 
                key={day} 
                className={dayClass}
                onClick={() => !isFullyBooked && onDateSelect(dateString)}
            >
                {day}
            </div>
        );
    }

    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

    const changeMonth = (delta) => {
        let newMonth = currentMonth + delta;
        let newYear = currentYear;
        if (newMonth > 11) {
            newMonth = 0;
            newYear += 1;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear -= 1;
        }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
        
        // Optional: Auto-select 1st of month
        const newDate = new Date(newYear, newMonth, 1);
        onDateSelect(formatDateLocal(newDate));
    };

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <button onClick={() => changeMonth(-1)} className="nav-btn">{"<"}</button>
                <h3>{monthName} {currentYear}</h3>
                <button onClick={() => changeMonth(1)} className="nav-btn">{">"}</button>
            </div>
            
            <div className="calendar-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="calendar-weekday">{d}</div>
                ))}
                {dateCells}
            </div>

            <div className="time-slots-view">
                <h4 className="time-slots-header">Slots for {selectedDate}</h4>
                {loading ? (
                    <p className="loading-text">Loading...</p>
                ) : (
                    <div className="slots-grid">
                        {TIME_SLOTS.map(slot => {
                            const isBooked = bookedTimes.includes(slot);
                            return (
                                <span 
                                    key={slot} 
                                    className={`time-slot ${isBooked ? 'booked' : 'available'}`}
                                    title={isBooked ? 'Booked' : 'Available'}
                                >
                                    {slot}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main Component ---
const AppointmentsModal = ({ onClose, onUpdate }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Initialize with local date string to match the fix
    const [selectedDate, setSelectedDate] = useState(formatDateLocal(new Date()));
    const [bookedTimes, setBookedTimes] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    
    const getPatientDetails = useCallback(async (patientIDRef) => {
        const patientID = patientIDRef.includes('/') ? patientIDRef.split('/').pop() : patientIDRef;
        const patientRef = doc(db, "patients", patientID); 
        try {
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
                const data = patientSnap.data();
                return data.fullName || (data.firstName + " " + data.lastName) || "Patient ID: " + patientID; 
            }
        } catch (e) {
            console.error("Error fetching patient details for ID:", patientID, e);
        }
        return "Unknown Patient";
    }, []);

    const fetchPendingAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                appointmentsCollectionRef, 
                where("status.isPending", "==", "Approval Pending")
            );
            const data = await getDocs(q);
            
            const pendingDataPromises = data.docs.map(async doc => {
                const apptData = doc.data();
                let patientFullName = apptData.patientFullName;
                if (!patientFullName && apptData.patientId) {
                    patientFullName = await getPatientDetails(apptData.patientId);
                }
                return {
                    id: doc.id, 
                    ...apptData,
                    patientFullName: patientFullName,
                };
            });
            
            const pendingData = await Promise.all(pendingDataPromises);
            setAppointments(pendingData);
        } catch (error) {
            console.error("Error fetching pending appointments:", error);
        } finally {
            setLoading(false);
        }
    }, [getPatientDetails]);

    const fetchBookedSlots = useCallback(async (dateString) => {
        setCalendarLoading(true);
        setBookedTimes([]); 
        try {
            const q = query(
                appointmentsCollectionRef, 
                where("scheduledDate", "==", dateString),
                where("status.isScheduled", "==", "Scheduled")
            );
            const querySnapshot = await getDocs(q);
            const booked = querySnapshot.docs.map(doc => doc.data().scheduledTime);
            setBookedTimes(booked);
        } catch (error) {
            console.error("Error fetching booked slots:", error);
        } finally {
            setCalendarLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookedSlots(selectedDate);
    }, [selectedDate, fetchBookedSlots]);

    useEffect(() => {
        fetchPendingAppointments();
    }, [fetchPendingAppointments]);

    const updateAppointmentStatus = async (id, action) => {
        const apptDoc = doc(db, "appointments", id);
        let newIsPendingStatus = "Not Pending";
        let newIsScheduledStatus = action === "Approved" ? "Scheduled" : "Declined";
        let newIsCompleteStatus = action === "Approved" ? "Pending" : "Cancelled"; 

        try {
            await updateDoc(apptDoc, {
                'status.isPending': newIsPendingStatus,
                'status.isScheduled': newIsScheduledStatus,
                'status.isComplete': newIsCompleteStatus,
                updatedAt: Timestamp.fromDate(new Date()),
            });
            
            await fetchPendingAppointments();
            if (action === "Approved") {
                const updatedAppt = appointments.find(appt => appt.id === id);
                if (updatedAppt && updatedAppt.scheduledDate === selectedDate) {
                    fetchBookedSlots(selectedDate);
                }
            }
            if (onUpdate) onUpdate(); 
        } catch (error) {
            console.error("Error updating appointment status:", error);
            alert(`Failed to update status: ${error.message}.`);
        }
    }
    
    const handleApprove = (id) => updateAppointmentStatus(id, "Approved");
    const handleDecline = (id) => updateAppointmentStatus(id, "Declined");

    const formatDateTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp * 1000); 
        return date.toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        }).replace(',', ''); 
    }

    return (
        <div className="modal-overlay">
            <div className="modal"> 
                <div className="modal-header">
                    <div className="modal-title">Pending Appointment Requests</div> 
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body modal-grid"> 
                    {/* LEFT SIDE */}
                    <div className="requests-panel">
                        {loading ? (
                            <p>Loading pending appointments...</p>
                        ) : appointments.length === 0 ? (
                            <p>No pending approvals found.</p>
                        ) : (
                            <div className="req-list">
                                {appointments.map(appt => (
                                    <div className="req-row" key={appt.id}>
                                        <div className="req-left">
                                            <div className="req-pill">
                                                <div className="req-name">{appt.patientFullName}</div>
                                                <div className="req-note">
                                                    {appt.serviceType} | {formatDateTime(appt.dateTime)}
                                                </div>
                                                <span className="req-chevron">›</span> 
                                            </div>
                                        </div>
                                        <div className="req-actions">
                                            <button className="approve" title="Approve" onClick={() => handleApprove(appt.id)}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="5"><path d="M20 6L9 17l-5-5"/></svg>
                                            </button>
                                            <button className="reject" title="Reject" onClick={() => handleDecline(appt.id)}>
                                                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* RIGHT SIDE */}
                    <div className="calendar-panel">
                        <CalendarView
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                            bookedTimes={bookedTimes}
                            loading={calendarLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentsModal;