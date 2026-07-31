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
const EMAILJS_SERVICE_ID = 'service_1f5gu18';
const EMAILJS_TEMPLATE_ID = 'template_mhkiqrv';
const EMAILJS_PUBLIC_KEY = 'TiVurg8fWvnl_Xu54';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

const resolveEmailValue = (...candidates) => {
    const email = candidates
        .map((candidate) => (typeof candidate === 'string' ? candidate.trim() : ''))
        .find((candidate) => candidate && candidate !== 'N/A');

    return email || '';
};

const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getAppointmentSortValue = (appointment) => {
    if (appointment?.dateTime?.toDate) {
        return appointment.dateTime.toDate().getTime();
    }

    if (appointment?.dateTime) {
        const parsedDateTime = new Date(appointment.dateTime);
        if (!Number.isNaN(parsedDateTime.getTime())) {
            return parsedDateTime.getTime();
        }
    }

    if (appointment?.scheduledDate) {
        const timePart = appointment.scheduledTime || '00:00';
        const parsedDateTime = new Date(`${appointment.scheduledDate}T${timePart}`);
        if (!Number.isNaN(parsedDateTime.getTime())) {
            return parsedDateTime.getTime();
        }

        const parsedDate = new Date(`${appointment.scheduledDate}T00:00:00`);
        if (!Number.isNaN(parsedDate.getTime())) {
            return parsedDate.getTime();
        }
    }

    return 0;
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
    const [rejectingAppointment, setRejectingAppointment] = useState(null);
    const [declineReason, setDeclineReason] = useState("");
    const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

    // --- EMAILJS REJECTION NOTIFICATION ---
    const sendRejectionEmail = async (apptData, reason = "") => {
        console.log("FINAL CHECK - Recipient Email:", apptData.patientEmail);

        if (!apptData.patientEmail || apptData.patientEmail.trim() === "") {
            console.error("STOPPING SEND: patientEmail variable is empty!");
            return;
        }

        const templateParams = {
            patient_name: apptData.patientFullName || "Valued Patient",
            status: "Declined",
            appointment_date: apptData.scheduledDate || "TBD",
            appointment_time: apptData.scheduledTime || "TBD",
            service_type: apptData.serviceType || "Dental Consultation",
            tracking_id: apptData.id,               
            to_email: apptData.patientEmail,        
            email: apptData.patientEmail,
            recipient_email: apptData.patientEmail,
            reply_to: apptData.patientEmail,
            message: `We are sorry, but we cannot accommodate your requested time slot.${reason ? ` Reason: ${reason}` : ""}`,
            rejection_reason: reason,
            decline_reason: reason,
            reason: reason,
        };

        try {
            const result = await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams,
                { publicKey: EMAILJS_PUBLIC_KEY }
            );
            console.log("EMAILJS SUCCESS:", result.text);
            return { ok: true };
        } catch (error) {
            const errorMessage = error?.text || error?.message || (typeof error === "string" ? error : "EmailJS request failed");
            console.error("EMAILJS ERROR:", error);
            return { ok: false, error: errorMessage };
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
                    email: resolveEmailValue(data.patientEmail, data.email, data.contactInfo)
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

                finalEmail = resolveEmailValue(finalEmail, apptData.contactInfo, apptData.email);

                return {
                    id: docSnap.id, 
                    ...apptData,
                    patientFullName: finalName,
                    patientEmail: finalEmail
                };
            });
            
            const pendingData = await Promise.all(pendingDataPromises);
            pendingData.sort((left, right) => getAppointmentSortValue(left) - getAppointmentSortValue(right));
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

    const updateAppointmentStatus = async (id, action, reason = "") => {
        // Find the record in our current state list so we have the email
        const apptToUpdate = appointments.find(a => a.id === id);
        if (!apptToUpdate) return;

        let recipientEmail = apptToUpdate.patientEmail || "";
        if (!recipientEmail && apptToUpdate.patientId) {
            const patientInfo = await getPatientFullData(apptToUpdate.patientId);
            recipientEmail = patientInfo.email || "";
        }

        recipientEmail = resolveEmailValue(recipientEmail, apptToUpdate.contactInfo, apptToUpdate.email);

        if (!recipientEmail) {
            throw new Error("Unable to resolve the patient's email address for this appointment.");
        }

        const apptDoc = doc(db, "appointments", id);
        let emailNotificationError = "";
        
        try {
            // 1. Update Firestore
            await updateDoc(apptDoc, {
                'status.isPending': "Not Pending",
                'status.isScheduled': action === "Approved" ? "Scheduled" : "Declined",
                'status.isComplete': action === "Approved" ? "Pending" : "Cancelled",
                'updatedAt': Timestamp.fromDate(new Date()),
                'status.trackingNote': action === "Approved" 
                    ? "Confirmed! See you at the clinic." 
                    : `Declined. Please contact us for a different slot.${reason ? ` Reason: ${reason}` : ""}`,
                'status.rejectionReason': action === "Approved" ? null : reason,
            });
            
            // 2. Log activity
            const userId = getCurrentUserId();
            const actionText = action === "Approved" ? "Approved an appointment" : "Rejected an appointment";
            await logActivity(userId, actionText, {
                appointmentId: id,
                patientName: apptToUpdate.patientFullName || "Unknown Patient",
                action: action,
                reason: action === "Declined" ? reason : undefined,
                scheduledDate: apptToUpdate.scheduledDate,
                scheduledTime: apptToUpdate.scheduledTime
            });
            
            // 3. Trigger the rejection email only for declined appointments
            if (action === "Declined") {
                const emailResult = await sendRejectionEmail({ ...apptToUpdate, patientEmail: recipientEmail }, reason);
                if (!emailResult.ok) {
                    emailNotificationError = emailResult.error;
                }
            }
            
            // 4. UI Refresh
            await fetchPendingAppointments();
            if (action === "Approved" && apptToUpdate.scheduledDate === selectedDate) {
                fetchBookedSlots(selectedDate);
            }
            if (onUpdate) onUpdate(); 

            if (action === "Declined") {
                alert(
                    emailNotificationError
                        ? `Success: Appointment Declined, but the notification failed: ${emailNotificationError}`
                        : "Success: Appointment Declined. Notification sent."
                );
            } else {
                alert("Success: Appointment Approved.");
            }

        } catch (error) {
            const errorMessage = error?.message || error?.text || (typeof error === "string" ? error : "Unknown error");
            console.error("Process failed:", error);
            alert(`Process failed: ${errorMessage}`);
        }
    }
    
    const handleApprove = (id) => updateAppointmentStatus(id, "Approved");
    const openDeclineModal = (appointment) => {
        setRejectingAppointment(appointment);
        setDeclineReason("");
    };

    const closeDeclineModal = () => {
        if (isSubmittingDecline) return;
        setRejectingAppointment(null);
        setDeclineReason("");
    };

    const handleSubmitDecline = async () => {
        if (!rejectingAppointment || isSubmittingDecline) return;

        const reason = declineReason.trim();
        if (!reason) {
            alert("Please add a reason before rejecting this appointment.");
            return;
        }

        setIsSubmittingDecline(true);
        try {
            await updateAppointmentStatus(rejectingAppointment.id, "Declined", reason);
            setRejectingAppointment(null);
            setDeclineReason("");
        } finally {
            setIsSubmittingDecline(false);
        }
    };

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
                                            <button className="reject" onClick={() => openDeclineModal(appt)}>
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

            {rejectingAppointment ? (
                <div className="decline-modal-overlay" role="presentation" onClick={closeDeclineModal}>
                    <div
                        className="decline-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="decline-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="decline-modal-header">
                            <div>
                                <div className="decline-modal-title" id="decline-modal-title">Add rejection reason</div>
                                <div className="decline-modal-subtitle">
                                    {rejectingAppointment.patientFullName} | {rejectingAppointment.serviceType}
                                </div>
                            </div>
                            <button className="decline-modal-close" onClick={closeDeclineModal} aria-label="Close rejection reason modal">
                                ×
                            </button>
                        </div>

                        <div className="decline-modal-body">
                            <label className="decline-modal-label" htmlFor="decline-reason">
                                Reason for declining
                            </label>
                            <textarea
                                id="decline-reason"
                                className="decline-modal-textarea"
                                value={declineReason}
                                onChange={(event) => setDeclineReason(event.target.value)}
                                placeholder="Example: The requested slot is already fully booked."
                                rows={5}
                                autoFocus
                            />
                            <p className="decline-modal-help">
                                This reason will be saved to the appointment and included in the email sent to the patient.
                            </p>
                        </div>

                        <div className="decline-modal-actions">
                            <button className="decline-modal-cancel" onClick={closeDeclineModal} disabled={isSubmittingDecline}>
                                Cancel
                            </button>
                            <button className="decline-modal-confirm" onClick={handleSubmitDecline} disabled={isSubmittingDecline}>
                                {isSubmittingDecline ? "Sending..." : "Send rejection"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default AppointmentsModal;