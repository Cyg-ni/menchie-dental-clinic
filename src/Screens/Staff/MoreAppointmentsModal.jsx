import React from "react";
import "./MoreAppointmentsModal.css";

const MoreAppointmentsModal = ({ onClose }) => {
  const items = [
    { name: "Juan Cruz", title: "Consultation", time: "08:30 – 09:00" },
    { name: "Bella Reyes", title: "Brace Adjustment", time: "09:15 – 10:00" },
    { name: "Ken Drussi", title: "Tooth Cleaning", time: "10:15 – 10:45" },
    { name: "Sean Mendez", title: "Full Dental Exam", time: "11:00 – 12:30" },
    { name: "Mika Renz", title: "Root Canal", time: "14:00 – 15:30" },
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Today's Appointments</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="appt-list-modal">
            {items.map((a, i) => (
              <div className="appt-row-modal" key={`${a.name}-${i}`}>
                <div className="avatar" />
                <div className="appt-content">
                  <div className="appt-name">{a.name}</div>
                  <div className="appt-title">{a.title}</div>
                </div>
                <div className="appt-right">
                  <div className="appt-time">{a.time}</div>
                  <div className="chev-modal">›</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoreAppointmentsModal;


