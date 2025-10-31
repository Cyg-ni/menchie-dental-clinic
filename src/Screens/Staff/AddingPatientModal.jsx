import React, { useState } from "react";
import "./AddingPatientModal.css";

const AddingPatientModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    contactNumber: "",
    service: "",
    contactInfo: "email@address.com",
    firstName: "John",
    lastName: "Doe",
    sendConfirmation: true,
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
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal add-patient-modal">
        <div className="modal-header">
          <div className="modal-title">Add New Patient</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body add-patient-body">
          <div className="patient-form-grid">
            <section className="patient-details-section">
              <div className="section-title">Patient Details</div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="contactNumber">Contact Number</label>
                  <input
                    type="text"
                    id="contactNumber"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder=""
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactInfo">Contact Information</label>
                  <input
                    type="text"
                    id="contactInfo"
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
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
                  />
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

                <div className="form-actions">
                  <button type="submit" className="btn-primary">Add User</button>
                  <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                </div>
              </form>
            </section>

            <div className="divider"></div>

            <section className="patient-picture-section">
              <div className="section-title">Patient Picture</div>
              <div className="image-upload-area">
                {imagePreview ? (
                  <img src={imagePreview} alt="Patient preview" className="preview-image" />
                ) : (
                  <div className="image-placeholder">
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

