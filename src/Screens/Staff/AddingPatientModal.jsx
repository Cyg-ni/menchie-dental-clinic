import React, { useState } from "react";
import "./AddingPatientModal.css";
// NOTE: Adjust the import path for 'db' if your firebase.js file is not in 'src/'
import { db } from "../../firebase"; 
import { collection, addDoc } from 'firebase/firestore';

const patientsCollectionRef = collection(db, "patients");

// Default structure for adding a new patient, matching your Firestore schema
const NEW_PATIENT_TEMPLATE = {
    dental_chart_upper: {}, 
    dental_lower_chart: {}, 
    medicalHistory: {
        Allergies: [],
        conditionNotes: "",
        currentMedications: []
    },
    updated: new Date().toISOString().slice(0, 10), 
    image: null
};

// IMPORTANT: We use 'onClose' and 'onSuccess' props
const AddingPatientModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        // Patient Details - ALL FIELDS
        firstName: "",
        lastName: "",
        contactNumber: "",
        age: "", 
        address: "", 
        gender: "", 
        occupation: "", 
        status: "", // Marital Status
        complaint: "", // Chief Complaint
        
        // Checkboxes
        sendConfirmation: true,
        isPregnant: false, 
        smokingStatus: false, 

        // Contact Info
        contactInfo: "", 
        
        image: null,
    });
    const [imagePreview, setImagePreview] = useState(null);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setFormData(prev => ({ ...prev, image: reader.result })); 
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName || !formData.contactNumber) {
            alert("Please fill in First Name, Last Name, and Contact Number.");
            return;
        }

        // Prepare the data for Firestore, mapping form data to DB fields
        const patientData = {
            ...NEW_PATIENT_TEMPLATE, 
            name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            phone_num: formData.contactNumber,
            contactInfo: formData.contactInfo || "N/A", 
            sendConfirmation: formData.sendConfirmation,
            age: parseInt(formData.age) || null,
            address: formData.address || "N/A",
            gender: formData.gender || "N/A",
            occupation: formData.occupation || "N/A",
            status: formData.status || "N/A",
            complaint: formData.complaint || "N/A",
            isPregnant: formData.isPregnant,
            smokingStatus: formData.smokingStatus,
            image: formData.image || null,
        };

        try {
            await addDoc(patientsCollectionRef, patientData);
            alert(`Patient ${patientData.name} successfully added!`);
            
            // FIX 1: Safe call after successful submission
            onClose?.(); 
            
            // Call onSuccess to trigger parent component actions (like refreshing patient list)
            if (onSuccess) onSuccess(); 
        } catch (error) {
            console.error("Error adding new patient:", error);
            alert("Failed to add patient. Please check Firebase rules or console for details.");
        }
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal add-patient-modal">
                <div className="modal-header">
                    <div className="modal-title">Add New Patient</div>
                    {/* FIX 2: Safe call for the 'X' button */}
                    <button 
                        className="modal-close" 
                        aria-label="Close" 
                        onClick={() => onClose?.()}
                    >
                        ×
                    </button>
                </div>
                <div className="modal-body add-patient-body">
                    <div className="patient-form-grid">
                        <section className="patient-details-section">
                            <div className="section-title">Patient Details</div>
                            <form onSubmit={handleSubmit}>
                                
                                {/* --- 1. Basic Info --- */}
                                <div className="form-group">
                                    <label htmlFor="firstName">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="lastName">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="contactNumber">Contact Number (Phone)</label>
                                    <input
                                        type="text"
                                        id="contactNumber"
                                        name="contactNumber"
                                        value={formData.contactNumber}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="contactInfo">Contact Information (Email)</label>
                                    <input
                                        type="email"
                                        id="contactInfo"
                                        name="contactInfo"
                                        value={formData.contactInfo}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* --- 2. Demographic Fields (NEWLY ADDED) --- */}

                                <div className="form-group">
                                    <label htmlFor="address">Address</label>
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="age">Age</label>
                                    <input
                                        type="number"
                                        id="age"
                                        name="age"
                                        value={formData.age}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="gender">Gender</label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="status">Marital Status</label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="occupation">Occupation</label>
                                    <input
                                        type="text"
                                        id="occupation"
                                        name="occupation"
                                        value={formData.occupation}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="complaint">Chief Complaint</label>
                                    <input
                                        type="text"
                                        id="complaint"
                                        name="complaint"
                                        value={formData.complaint}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                
                                {/* --- 3. Checkboxes (Medical/Confirmation) --- */}

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="isPregnant"
                                            checked={formData.isPregnant}
                                            onChange={handleInputChange}
                                        />
                                        <span>Is Pregnant?</span>
                                    </label>
                                </div>

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="smokingStatus"
                                            checked={formData.smokingStatus}
                                            onChange={handleInputChange}
                                        />
                                        <span>Smoker?</span>
                                    </label>
                                </div>
                                
                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="sendConfirmation"
                                            checked={formData.sendConfirmation}
                                            onChange={handleInputChange}
                                        />
                                        <span>Send email/sms confirmation</span>
                                    </label>
                                </div>

                                {/* --- 4. Actions --- */}
                                <div className="form-actions">
                                    <button type="submit" className="btn-primary">Add User</button>
                                    {/* FIX 3: Safe call for the Cancel button */}
                                    <button 
                                        type="button" 
                                        className="btn-secondary" 
                                        onClick={() => onClose?.()}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </section>

                        <div className="divider"></div>

                        {/* --- 5. Patient Picture Section --- */}
                        <section className="patient-picture-section">
                            <div className="section-title">Patient Picture</div>
                            <div className="image-upload-area">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Patient preview" className="preview-image" />
                                ) : (
                                    <div className="image-placeholder">
                                        {/* SVG placeholder icon */}
                                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="14" rx="2"/>
                                            <path d="M7 18l3-3"/>
                                            <path d="M14 18l3-3"/>
                                        </svg>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="imageUpload"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    style={{ display: "none" }}
                                />
                                <label htmlFor="imageUpload" className="select-image-btn">
                                    Select image
                                </label>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddingPatientModal;