import React, { useState, useEffect, useCallback } from "react";
import "./AppointmentsModal.css";

// ===============================================
// 1. FIREBASE SETUP & IMPORTS (Self-Contained)
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

// *** REPLACE THIS CONFIG WITH YOUR ACTUAL PROJECT CONFIGURATION ***
// (Assuming you placed your real config here from the last step)
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


const AppointmentsModal = ({ onClose, onUpdate }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const getPatientDetails = useCallback(async (patientIDRef) => {
        const patientID = patientIDRef.includes('/') ? patientIDRef.split('/').pop() : patientIDRef;
        const patientRef = doc(db, "patients", patientID); 
        try {
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
                const data = patientSnap.data();
                // Prioritize patientFullName if stored in the appointment document, otherwise use patient data
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
            // Query the nested status field for pending approval
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

    useEffect(() => {
        fetchPendingAppointments();
    }, [fetchPendingAppointments]);

    // Handler to update the status of an appointment
    const updateAppointmentStatus = async (id, action) => {
        const apptDoc = doc(db, "appointments", id);
        
        // Define status updates based on action
        let newIsPendingStatus = "Not Pending";
        let newIsScheduledStatus = action === "Approved" ? "Scheduled" : "Declined";
        let newIsCompleteStatus = action === "Approved" ? "Pending" : "Cancelled"; // Use 'Cancelled' for declined

        try {
            await updateDoc(apptDoc, {
                'status.isPending': newIsPendingStatus,
                'status.isScheduled': newIsScheduledStatus,
                'status.isComplete': newIsCompleteStatus,
                updatedAt: Timestamp.fromDate(new Date()),
            });
            
            // Refresh list (removes approved/rejected item) and notify dashboard
            await fetchPendingAppointments();
            if (onUpdate) {
                onUpdate(); 
            }
        } catch (error) {
            console.error("Error updating appointment status:", error);
            alert(`Failed to update status: ${error.message}.`);
        }
    }
    
    const handleApprove = (id) => updateAppointmentStatus(id, "Approved");
    const handleDecline = (id) => updateAppointmentStatus(id, "Declined");

    // Helper function to format the timestamp
    const formatDateTime = (seconds) => {
        if (!seconds) return 'N/A';
        let date = seconds.toDate ? seconds.toDate() : new Date(seconds * 1000); 
        
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
        });
    }

    return (
        <div className="modal-overlay">
            {/* Using the .modal class from the CSS */}
            <div className="modal"> 
                <div className="modal-header">
                    {/* Using the .modal-title class from the CSS */}
                    <div className="modal-title">Pending Appointment Requests</div> 
                    {/* Using the .modal-close class from the CSS */}
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    {loading ? (
                        <p>Loading pending appointments...</p>
                    ) : appointments.length === 0 ? (
                        <p>No pending approvals found.</p>
                    ) : (
                        <div className="req-list">
                            {appointments.map(appt => (
                                <div className="req-row" key={appt.id}>
                                    
                                    {/* Left side: Patient info pill */}
                                    <div className="req-left">
                                        <div className="req-pill">
                                            <div className="req-name">{appt.patientFullName}</div>
                                            <div className="req-note">
                                                {appt.serviceType} | {formatDateTime(appt.dateTime)}
                                            </div>
                                            {/* Optional chevron based on your CSS; assumes no function */}
                                            <span className="req-chevron">›</span> 
                                        </div>
                                    </div>

                                    {/* Right side: Actions */}
                                    <div className="req-actions">
                                        <button className="approve" title="Approve" onClick={() => handleApprove(appt.id)}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                                <path d="M20 6L9 17l-5-5"/>
                                            </svg>
                                        </button>
                                        <button className="reject" title="Reject" onClick={() => handleDecline(appt.id)}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18"/>
                                                <line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentsModal;