import React from "react";
import "./AppointmentsModal.css";

const CheckIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

const AppointmentsModal = ({ onClose }) => (
  <div className="modal-overlay" role="dialog" aria-modal="true">
    <div className="modal">
      <div className="modal-header">
        <div className="modal-title">Appointment Requests</div>
        <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="req-list">
          {[{ name: "Juan Cruz", note: "Decayed Tooth" }, { name: "Bella Reyes", note: "Brace Adjustment" }].map((r, i) => (
            <div className="req-row" key={i}>
              <div className="req-left">
                <div className="avatar" />
                <div className="req-pill">
                  <div className="req-name">{r.name}</div>
                  <div className="req-note">{r.note}</div>
                  <div className="req-chevron">›</div>
                </div>
              </div>
              <div className="req-actions">
                <button className="approve" aria-label="Approve"><CheckIcon /></button>
                <button className="reject" aria-label="Reject"><XIcon /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default AppointmentsModal;


