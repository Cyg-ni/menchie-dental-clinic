import React, { useState, useEffect } from "react";
import "./AddingPatientModal.css";
// NOTE: Adjust the import path for 'db' if your firebase.js file is not in 'src/'
import { db } from "../../firebase"; 
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'; 

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

// Function to parse the combined 'name' field back into first/last name
const parseName = (fullName) => {
    const parts = fullName?.split(' ') || ['', ''];
    return {
        firstName: parts[0] || '',
        // The rest of the parts are treated as the last name
        lastName: parts.slice(1).join(' ') || '' 
    };
};

// Utility function to generate the initial form state
const getInitialFormData = (patient) => {
    
    // Medical History fields for initialization
    const medicalHistory = patient?.medicalHistory || NEW_PATIENT_TEMPLATE.medicalHistory;
    
    // Convert arrays back into single comma-separated strings for input fields
    const allergiesArray = medicalHistory.Allergies || [];
    const currentMedsArray = medicalHistory.currentMedications || [];

    return {
        // ID is crucial for editing, but not part of the form fields
        id: patient?.id || null, 
        
        // Use existing data or default to empty strings
        firstName: patient ? parseName(patient.name).firstName : "",
        lastName: patient ? parseName(patient.name).lastName : "",
        
        contactNumber: patient?.phone_num || "",
        age: patient?.age?.toString() || "", // Convert number to string for input value
        address: patient?.address || "", 
        gender: patient?.gender || "", 
        occupation: patient?.occupation || "", 
        status: patient?.status || "", // Marital Status
        
        // --- NEW/UPDATED MEDICAL FIELDS ---
        allergies: allergiesArray.join(', ') || "", 
        conditionNotes: medicalHistory.conditionNotes || "", // NEW FIELD
        currentMedications: currentMedsArray.join(', ') || "", // NEW FIELD
        // ----------------------------------
        
        // Checkboxes: use existing value (??) or default
        sendConfirmation: patient?.sendConfirmation ?? true, 
        isPregnant: patient?.isPregnant ?? false, 
        smokingStatus: patient?.smokingStatus ?? false, 

        // Contact Info
        contactInfo: patient?.contactInfo || "", 
        
        // Image
        image: patient?.image || null,
    };
};


const AddingPatientModal = ({ onClose, onSuccess, patientToEdit }) => {
    
    // Initialize state using the utility function, based on the prop
    const [formData, setFormData] = useState(getInitialFormData(patientToEdit));
    const [imagePreview, setImagePreview] = useState(patientToEdit?.image || null);
    const isEditing = !!patientToEdit;

    // FIX FOR EDIT: Use useEffect to re-initialize state when patientToEdit changes
    useEffect(() => {
        const initialData = getInitialFormData(patientToEdit);
        setFormData(initialData);
        setImagePreview(patientToEdit?.image || null);
    }, [patientToEdit]);
    // ---------------------------------------------------------------------------------


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

        // Prepare the arrays for saving
        const newAllergiesArray = formData.allergies 
            ? formData.allergies.split(',').map(s => s.trim()).filter(s => s.length > 0)
            : [];
            
        const newMedsArray = formData.currentMedications 
            ? formData.currentMedications.split(',').map(s => s.trim()).filter(s => s.length > 0)
            : [];
            
        // 1. Prepare data for Firestore
        const dataToSave = {
            // Spread existing data first
            ...(isEditing ? patientToEdit : NEW_PATIENT_TEMPLATE), 
            
            // Map form state to DB field names
            name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            phone_num: formData.contactNumber,
            contactInfo: formData.contactInfo || "N/A", 
            sendConfirmation: formData.sendConfirmation,
            age: parseInt(formData.age) || null,
            address: formData.address || "N/A",
            gender: formData.gender || "N/A",
            occupation: formData.occupation || "N/A",
            status: formData.status || "N/A",
            isPregnant: formData.isPregnant,
            smokingStatus: formData.smokingStatus,
            image: formData.image || null,
            updated: new Date().toISOString().slice(0, 10), 

            // --- UPDATED MEDICAL HISTORY ---
            medicalHistory: {
                ...(isEditing ? patientToEdit.medicalHistory : NEW_PATIENT_TEMPLATE.medicalHistory),
                Allergies: newAllergiesArray, // Save the parsed array
                conditionNotes: formData.conditionNotes || "", // Save Condition Notes
                currentMedications: newMedsArray, // Save Current Medications array
            },
            // --------------------------
        };

        try {
            if (isEditing) {
                // UPDATE EXISTING PATIENT
                const patientDoc = doc(db, "patients", formData.id);
                await updateDoc(patientDoc, dataToSave);
                alert(`Patient ${dataToSave.name} successfully updated!`);
            } else {
                // ADD NEW PATIENT
                // Ensure we don't accidentally save the 'id' field if it was null
                const { id, ...saveData } = dataToSave; 
                await addDoc(patientsCollectionRef, saveData);
                alert(`Patient ${dataToSave.name} successfully added!`);
            }
            
            onClose?.(); 
            if (onSuccess) onSuccess(); // Trigger parent list refresh
            
        } catch (error) {
            console.error(`Error ${isEditing ? 'updating' : 'adding'} patient:`, error);
            alert(`Failed to ${isEditing ? 'update' : 'add'} patient. Please check console for details.`);
        }
    };

    // --- RENDER ---
    const modalTitle = isEditing ? `Edit Patient: ${formData.firstName} ${formData.lastName}` : "Add New Patient";

    return (
        // Added onClick to overlay to close the modal if clicked outside
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => onClose?.()}>
            {/* Added onClick stopPropagation to prevent modal body clicks from closing the modal */}
            <div className="modal add-patient-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">{modalTitle}</div>
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

                                {/* --- 2. Demographic Fields --- */}

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

                                {/* --- 3. MEDICAL HISTORY INPUTS --- */}
                                
                                <div className="form-group">
                                    <label htmlFor="allergies">Allergies</label>
                                    <input
                                        type="text"
                                        id="allergies"
                                        name="allergies"
                                        value={formData.allergies}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Penicillin, Peanuts"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="conditionNotes">Condition Notes</label>
                                    <input
                                        type="text"
                                        id="conditionNotes"
                                        name="conditionNotes"
                                        value={formData.conditionNotes}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="currentMedications">Current Meds</label>
                                    <input
                                        type="text"
                                        id="currentMedications"
                                        name="currentMedications"
                                        value={formData.currentMedications}
                                        onChange={handleInputChange}
                                        placeholder="Separate meds with commas"
                                    />
                                </div>
                                
                                {/* ----------------------- */}
                                
                                {/* --- 4. Checkboxes (Medical/Confirmation) --- */}

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

                                {/* --- 5. Actions --- */}
                                <div className="form-actions">
                                    <button type="submit" className="btn-primary">
                                        {isEditing ? 'Save Changes' : 'Add User'}
                                    </button>
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

                        {/* --- 6. Patient Picture Section --- */}
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
                                    {imagePreview ? 'Change Image' : 'Select image'}
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