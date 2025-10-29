import React, { useState } from 'react';
import './BookAppointment.css';

const BookAppointment = ({ user }) => {
  const [formData, setFormData] = useState({
    service: '',
    doctor: '',
    date: '',
    time: '',
    reason: '',
    urgency: 'routine'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const services = [
    'General Consultation',
    'Laboratory Services',
    'X-Ray Examination',
    'Ultrasound',
    'ECG',
    'Blood Test',
    'Vaccination',
    'Physical Therapy',
    'Dental Care',
    'Eye Examination'
  ];

  const doctors = [
    { name: 'Dr. Sarah Johnson', specialty: 'Internal Medicine' },
    { name: 'Dr. Michael Chen', specialty: 'General Surgery' },
    { name: 'Dr. Emily Rodriguez', specialty: 'Pediatrics' },
    { name: 'Dr. James Wilson', specialty: 'Emergency Medicine' },
    { name: 'Dr. Lisa Park', specialty: 'Cardiology' },
    { name: 'Dr. Robert Brown', specialty: 'Orthopedics' }
  ];

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmation(true);
    }, 2000);
  };

  const resetForm = () => {
    setFormData({
      service: '',
      doctor: '',
      date: '',
      time: '',
      reason: '',
      urgency: 'routine'
    });
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    return (
      <div className="appointment-booking">
        <div className="confirmation-container">
          <div className="confirmation-card">
            <div className="success-icon">✅</div>
            <h2>Appointment Confirmed!</h2>
            <div className="appointment-details">
              <h3>Appointment Details</h3>
              <div className="detail-row">
                <span>Service:</span>
                <span>{formData.service}</span>
              </div>
              <div className="detail-row">
                <span>Doctor:</span>
                <span>{formData.doctor}</span>
              </div>
              <div className="detail-row">
                <span>Date:</span>
                <span>{new Date(formData.date).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span>Time:</span>
                <span>{formData.time}</span>
              </div>
              <div className="detail-row">
                <span>Priority:</span>
                <span className={`priority ${formData.urgency}`}>
                  {formData.urgency.charAt(0).toUpperCase() + formData.urgency.slice(1)}
                </span>
              </div>
            </div>
            <div className="confirmation-actions">
              <button className="btn btn-primary">Add to Calendar</button>
              <button className="btn btn-secondary" onClick={resetForm}>
                Book Another
              </button>
            </div>
            <div className="next-steps">
              <h4>What's Next?</h4>
              <ul>
                <li>You'll receive a confirmation email shortly</li>
                <li>Please arrive 15 minutes before your appointment</li>
                <li>Bring a valid ID and insurance card</li>
                <li>You can reschedule up to 24 hours in advance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appointment-booking">
      <div className="booking-container">
        <div className="booking-header">
          <h2>Book an Appointment</h2>
          <p>Schedule your visit with our healthcare professionals</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Service Type *</label>
              <select
                name="service"
                value={formData.service}
                onChange={handleInputChange}
                className="form-input"
                required
              >
                <option value="">Select a service</option>
                {services.map((service, index) => (
                  <option key={index} value={service}>{service}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Doctor *</label>
              <select
                name="doctor"
                value={formData.doctor}
                onChange={handleInputChange}
                className="form-input"
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor, index) => (
                  <option key={index} value={doctor.name}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preferred Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Time *</label>
              <select
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className="form-input"
                required
              >
                <option value="">Select a time</option>
                {timeSlots.map((time, index) => (
                  <option key={index} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Priority Level</label>
            <div className="urgency-options">
              <label className="urgency-option">
                <input
                  type="radio"
                  name="urgency"
                  value="routine"
                  checked={formData.urgency === 'routine'}
                  onChange={handleInputChange}
                />
                <span className="urgency-label routine">Routine</span>
              </label>
              <label className="urgency-option">
                <input
                  type="radio"
                  name="urgency"
                  value="urgent"
                  checked={formData.urgency === 'urgent'}
                  onChange={handleInputChange}
                />
                <span className="urgency-label urgent">Urgent</span>
              </label>
              <label className="urgency-option">
                <input
                  type="radio"
                  name="urgency"
                  value="emergency"
                  checked={formData.urgency === 'emergency'}
                  onChange={handleInputChange}
                />
                <span className="urgency-label emergency">Emergency</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Visit</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="form-input"
              rows="4"
              placeholder="Please describe your symptoms or reason for the visit..."
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Booking Appointment...' : 'Book Appointment'}
          </button>
        </form>

        <div className="booking-info">
          <h3>Booking Information</h3>
          <div className="info-grid">
            <div className="info-card">
              <h4>📅 Scheduling</h4>
              <p>Appointments can be booked up to 30 days in advance. Same-day appointments may be available for urgent cases.</p>
            </div>
            <div className="info-card">
              <h4>⏰ Cancellation</h4>
              <p>Please cancel at least 24 hours in advance to avoid cancellation fees. Emergency cancellations are understood.</p>
            </div>
            <div className="info-card">
              <h4>💳 Payment</h4>
              <p>We accept most insurance plans, cash, and card payments. Co-pays are due at the time of service.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
