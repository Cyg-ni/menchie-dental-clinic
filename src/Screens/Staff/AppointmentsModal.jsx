import React, { useState, useEffect } from "react";
// FIX 1: Corrected path for component in src/Screens/Staff/
import { db } from "../../firebase"; 
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    query, 
    where, 
    getDoc 
} from 'firebase/firestore'; 

import "./AppointmentsModal.css";

const appointmentsCollectionRef = collection(db, "appointments");

const AppointmentsModal = ({ onClose, onUpdate }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Function to fetch patient details using the patientID from the appointment
    const getPatientDetails = async (patientID) => {
        const patientRef = doc(db, "patients", patientID);
        try {
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
                const data = patientSnap.data();
                // Return a combined name field for display
                return data.name || (data.firstName + " " + data.lastName); 
            }
        } catch (e) {
            console.error("Error fetching patient details for ID:", patientID, e);
        }
        return "Unknown Patient";
    };

    // Function to fetch pending appointments and patient names
    const fetchPendingAppointments = async () => {
        setLoading(true);
        try {
            // FIX 2: Query the database for appointments awaiting approval
            const q = query(
                appointmentsCollectionRef, 
                where("status", "==", "Approval Pending")
            );
            const data = await getDocs(q);
            
            const pendingDataPromises = data.docs.map(async doc => {
                const apptData = doc.data();
                // Safely extract the patient ID
                const patientID = apptData.patientID.includes('/') ? apptData.patientID.split('/').pop() : apptData.patientID;
                
                // Fetch the full name
                const patientFullName = await getPatientDetails(patientID);

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
    };

    useEffect(() => {
        fetchPendingAppointments();
    }, []);

    // Handler to update the status of an appointment
    const updateAppointmentStatus = async (id, newStatus) => {
        try {
            const apptDoc = doc(db, "appointments", id);
            await updateDoc(apptDoc, {
                status: newStatus,
                isScheduled: newStatus === "Approved" ? true : false
            });
            
            // Refresh list and dashboard count
            fetchPendingAppointments();
            if (onUpdate) {
                onUpdate(); 
            }
        } catch (error) {
            console.error("Error updating appointment status:", error);
            alert("Failed to update appointment status. Check Firebase Rules.");
        }
    }
    
    const handleApprove = (id) => updateAppointmentStatus(id, "Approved");
    const handleDecline = (id) => updateAppointmentStatus(id, "Declined");

    // Helper function to format the timestamp
    const formatDateTime = (seconds) => {
        if (!seconds) return 'N/A';
        return new Date(seconds * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Pending Appointment Requests</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <p>Loading pending appointments...</p>
                    ) : appointments.length === 0 ? (
                        <p>No pending approvals found.</p>
                    ) : (
                        <table className="approval-table">
                            <thead>
                                <tr>
                                    <th>Patient Name</th>
                                    <th>Service</th>
                                    <th>Date/Time</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map(appt => (
                                    <tr key={appt.id}>
                                        <td>{appt.patientFullName || 'Loading...'}</td>
                                        <td>{appt.serviceType}</td>
                                        <td>
                                            {formatDateTime(appt.dateTime?.seconds)}
                                        </td>
                                        <td>
                                            <button className="btn success" onClick={() => handleApprove(appt.id)}>Approve</button>
                                            <button className="btn danger" onClick={() => handleDecline(appt.id)}>Decline</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentsModal;