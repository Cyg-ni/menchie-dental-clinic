import React, { useState, useEffect, useCallback } from "react";
import "./AddingPatientModal.css";

// This template defines the structure needed for a new patient document in Firestore
const NEW_PATIENT_TEMPLATE = {
    // Local fields for form input:
    id: null, // Temporary ID for edit mode detection
    firstName: "", 
    lastName: "",
    // Firestore fields (will be validated/combined on submit):
    name: "", // Combined from firstName and lastName
    phone_num: "",
    address: "", // Added input field for completeness
    contactInfo: "", 
    sendConfirmation: true,
    age: "", 
    gender: "",
    occupation: "",
    status: "", 
    complaint: "",
    isPregnant: false,
    smokingStatus: false,
    image: null,
    // Nested data structure (Crucial to initialize to prevent errors)
    medicalHistory: {
        Allergies: [],
        conditionNotes: "",
        currentMedications: []
    },
};

export default function AddingPatientModal({ open, initial, onSubmit, onCancel }) {
  // Use a combined state for form data
  const [formData, setFormData] = useState(NEW_PATIENT_TEMPLATE);

  // Set initial data when the modal opens or 'initial' prop changes
  useEffect(() => {
    if (open && initial) {
      // If initial patient data exists, use it.
      // The patient list already breaks down 'name' into 'firstName'/'lastName' for the form
      setFormData({ 
        ...NEW_PATIENT_TEMPLATE, 
        ...initial 
      });
    } else if (open) {
      // Reset to a clean template for adding a new patient
      setFormData(NEW_PATIENT_TEMPLATE);
    }
  }, [open, initial]);

  // Handle standard input changes (text, number, email, etc.)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle image selection (reads file into a Base64 string for preview/temporary handling)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result, // This is the Base64 string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    // 1. COMBINE NAME FIELDS: This is the crucial step for data consistency
    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
    
    // 2. CREATE FINAL DATA OBJECT: Prepare the data for Firestore
    const dataToSubmit = {
      ...formData,
      name: fullName.trim(),
      // Ensure age is a string for the form, but it will be parsed to a number 
      // in the parent's handleSubmit function for Firestore.
      age: formData.age.toString(), 
      // Ensure medicalHistory is always present, even if empty, to match the schema
      medicalHistory: formData.medicalHistory || NEW_PATIENT_TEMPLATE.medicalHistory,
    };
    
    // 3. Submit to the parent component's CRUD function
    try {
        onSubmit(dataToSubmit);
    } catch (error) {
        // If the submit itself fails (e.g., parent function is sync/has issue)
        console.error("Submission failed in modal:", error);
        // Do NOT call onCancel here if onSubmit failed and the parent shows an error,
        // unless you want to close the form regardless of success.
    }
    
  }, [formData, onSubmit]);


  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal add-patient-modal" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div className="modal-title">{initial && initial.id ? "Edit Patient" : "Add New Patient"}</div>
            {/* FIX: Call onCancel prop */}
            <button type="button" className="modal-close" aria-label="Close" onClick={onCancel}>×</button>
          </div>
          
          <div className="modal-body add-patient-body">
            <div className="patient-form-grid">
              
              <section className="patient-details-section">
                <div className="section-title">Patient Details</div>
                
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone_num">Contact Number (Phone)</label>
                  <input type="text" id="phone_num" name="phone_num" value={formData.phone_num} onChange={handleChange} />
                </div>
                
                <div className="form-group">
                  <label htmlFor="age">Age</label>
                  <input type="number" id="age" name="age" value={formData.age} onChange={handleChange} min="0" max="120" required />
                </div>

                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} />
                </div>
                
                <div className="form-group">
                  <label htmlFor="contactInfo">Contact Information (Email)</label>
                  <input type="email" id="contactInfo" name="contactInfo" value={formData.contactInfo} onChange={handleChange} placeholder="email@address.com" />
                </div>

                <div className="form-group checkbox-group">
                  <input type="checkbox" id="sendConfirmation" name="sendConfirmation" checked={formData.sendConfirmation} onChange={handleChange} />
                  <label htmlFor="sendConfirmation">Send email/sms confirmation</label>
                </div>

                <div className="section-title" style={{ marginTop: '15px' }}>Additional Info</div>

                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="occupation">Occupation</label>
                  <input type="text" id="occupation" name="occupation" value={formData.occupation} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="status">Marital Status</label>
                  <select id="status" name="status" value={formData.status} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="isPregnant" name="isPregnant" checked={formData.isPregnant} onChange={handleChange} />
                  <label htmlFor="isPregnant">Is Pregnant</label>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="smokingStatus" name="smokingStatus" checked={formData.smokingStatus} onChange={handleChange} />
                  <label htmlFor="smokingStatus">Smoking Status</label>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="complaint">Primary Complaint</label>
                  <textarea id="complaint" name="complaint" value={formData.complaint} onChange={handleChange} rows="3" />
                </div>
                
              </section>

              <div className="divider"></div>

              <section className="patient-picture-section">
                <div className="section-title">Patient Picture</div>
                <div className="image-upload-area">
                  {formData.image
                    ? <img src={formData.image} alt="Preview" className="preview-image" />
                    : (
                      <div className="image-placeholder">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="14" rx="2"/>
                          <path d="M7 18l3-3"/>
                          <path d="M14 18l3-3"/>
                        </svg>
                      </div>
                    )}
                </div>
                <input 
                  type="file" 
                  id="imageUpload" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  style={{ display: 'none' }} 
                />
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={() => document.getElementById('imageUpload').click()}
                >
                  Select image
                </button>
                {formData.image && (
                    <button 
                        type="button" 
                        className="btn-link" 
                        style={{ marginTop: '5px' }} 
                        onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                    >
                        Remove image
                    </button>
                )}
              </section>

            </div>
          </div>
          
          <div className="modal-footer">
            <button type="submit" className="btn-primary">
              {initial && initial.id ? "Save Changes" : "Add User"}
            </button>
            {/* FIX: Call onCancel prop */}
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}