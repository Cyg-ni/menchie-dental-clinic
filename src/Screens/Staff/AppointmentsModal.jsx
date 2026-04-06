import React, { useState, useEffect, useCallback } from "react";
import "./AppointmentsModal.css";
import CalendarView from './AppointmentCalendar.jsx';
import emailjs from '@emailjs/browser';
import { logActivity, getCurrentUserId } from '../../utils/activityLogger';

// ===============================================
// 1. FIREBASE SETUP
// ===============================================
import { 
    collection, 
    doc, 
    updateDoc, 
    query, 
    where, 
    getDoc,
    getDocs,
    Timestamp 
} from 'firebase/firestore'; 
import { db } from '../../firebase';

const appointmentsCollectionRef = collection(db, "appointments");

const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ===============================================
// 2. MAIN COMPONENT
// ===============================================
const AppointmentsModal = ({ onClose, onUpdate }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(formatDateLocal(new Date()));
    const [bookedTimes, setBookedTimes] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);

    // --- ENHANCED EMAILJS LOGIC ---
    const sendStatusEmail = async (apptData, action) => {
        const SERVICE_ID = 'service_yei2sk7'; 
        const TEMPLATE_ID = 'template_w1rp87d';
        const PUBLIC_KEY = 'Bw_dLBXg4UIfg4mUh';

        // 🔍 DEBUG: See exactly what address we are sending to
        console.log("FINAL CHECK - Recipient Email:", apptData.patientEmail);

        if (!apptData.patientEmail || apptData.patientEmail.trim() === "") {
            console.error("STOPPING SEND: patientEmail variable is empty!");
            return;
        }

        const templateParams = {
            patient_name: apptData.patientFullName || "Valued Patient",
            status: action,                         
            appointment_date: apptData.scheduledDate || "TBD",
            appointment_time: apptData.scheduledTime || "TBD",
            service_type: apptData.serviceType || "Dental Consultation",
            tracking_id: apptData.id,               
            to_email: apptData.patientEmail,        
            message: action === "Approved" 
                ? "Good news! Your appointment request has been confirmed." 
                : "We are sorry, but we cannot accommodate your requested time slot."
        };

        try {
            const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
            console.log("✅ EMAILJS SUCCESS:", result.text);
        } catch (error) {
            console.error("❌ EMAILJS ERROR:", error); 
        }
    };
    
    // FETCH FULL PATIENT DATA (Name & Email)
    const getPatientFullData = useCallback(async (patientIDRef) => {
        const patientID = patientIDRef.includes('/') ? patientIDRef.split('/').pop() : patientIDRef;
        const patientRef = doc(db, "patients", patientID); 
        try {
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
                const data = patientSnap.data();
                return {
                    name: data.fullName || (data.firstName + " " + data.lastName) || "Patient",
                    email: data.patientEmail || data.email || "" // Checks both common field names
                };
            }
        } catch (e) {
            console.error("Error fetching patient details:", e);
        }
        return { name: "Unknown Patient", email: "" };
    }, []);

    const fetchPendingAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                appointmentsCollectionRef, 
                where("status.isPending", "==", "Approval Pending")
            );
            const data = await getDocs(q);
            
            const pendingDataPromises = data.docs.map(async docSnap => {
                const apptData = docSnap.data();
                
                // If the appointment doesn't have the email/name, go get it from the Patient doc
                let finalName = apptData.patientFullName;
                let finalEmail = apptData.patientEmail;

                if ((!finalName || !finalEmail) && apptData.patientId) {
                    const patientInfo = await getPatientFullData(apptData.patientId);
                    finalName = finalName || patientInfo.name;
                    finalEmail = finalEmail || patientInfo.email;
                }

                return {
                    id: docSnap.id, 
                    ...apptData,
                    patientFullName: finalName,
                    patientEmail: finalEmail
                };
            });
            
            const pendingData = await Promise.all(pendingDataPromises);
            setAppointments(pendingData);
        } catch (error) {
            console.error("Error fetching pending appointments:", error);
        } finally {
            setLoading(false);
        }
    }, [getPatientFullData]);

    const fetchBookedSlots = useCallback(async (dateString) => {
        setCalendarLoading(true);
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
        // Find the record in our current state list so we have the email
        const apptToUpdate = appointments.find(a => a.id === id);
        if (!apptToUpdate) return;

        const apptDoc = doc(db, "appointments", id);
        
        try {
            // 1. Update Firestore
            await updateDoc(apptDoc, {
                'status.isPending': "Not Pending",
                'status.isScheduled': action === "Approved" ? "Scheduled" : "Declined",
                'status.isComplete': action === "Approved" ? "Pending" : "Cancelled",
                'updatedAt': Timestamp.fromDate(new Date()),
                'status.trackingNote': action === "Approved" 
                    ? "Confirmed! See you at the clinic." 
                    : "Declined. Please contact us for a different slot."
            });
            
            // 2. Log activity
            const userId = getCurrentUserId();
            const actionText = action === "Approved" ? "Approved an appointment" : "Rejected an appointment";
            await logActivity(userId, actionText, {
                appointmentId: id,
                patientName: apptToUpdate.patientFullName || "Unknown Patient",
                action: action,
                scheduledDate: apptToUpdate.scheduledDate,
                scheduledTime: apptToUpdate.scheduledTime
            });
            
            // 3. Trigger Email with the data we found during fetch
            await sendStatusEmail(apptToUpdate, action);
            
            // 4. UI Refresh
            await fetchPendingAppointments();
            if (action === "Approved" && apptToUpdate.scheduledDate === selectedDate) {
                fetchBookedSlots(selectedDate);
            }
            if (onUpdate) onUpdate(); 

            alert(`Success: Appointment ${action}. Notification sent.`);

        } catch (error) {
            console.error("Process failed:", error);
            alert(`Process failed: ${error.message}`);
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
                    <div className="requests-panel">
                        {loading ? <p>Loading...</p> : appointments.length === 0 ? <p>No pending approvals found.</p> : (
                            <div className="req-list">
                                {appointments.map(appt => (
                                    <div className="req-row" key={appt.id}>
                                        <div className="req-left">
                                            <div className="req-pill">
                                                <div className="req-name">{appt.patientFullName}</div>
                                                <div className="req-note">{appt.serviceType} | {formatDateTime(appt.dateTime)}</div>
                                                <span className="req-chevron">›</span> 
                                            </div>
                                        </div>
                                        <div className="req-actions">
                                            <button className="approve" onClick={() => handleApprove(appt.id)}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="5"><path d="M20 6L9 17l-5-5"/></svg>
                                            </button>
                                            <button className="reject" onClick={() => handleDecline(appt.id)}>
                                                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
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