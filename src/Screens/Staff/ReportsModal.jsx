import React from "react";
import "./ReportsModal.css";

const Category = ({ title, appointments, color }) => (
  <div className="rep-cat">
    <div className="rep-cat-title" style={{ borderColor: color }}>{title}</div>
    <ul className="rep-cat-list">
      {appointments.map((apt, idx) => (
        <li key={idx} className="rep-item">
          <span className="dot" style={{ background: color }} />
          <div className="rep-item-content">
            <div className="rep-item-name">{apt.name}</div>
            <div className="rep-item-info">{apt.date} • {apt.time}</div>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const ReportsModal = ({ onClose }) => {
  const dentalExams = [
    { name: "Maria Santos", date: "Oct 15, 2025", time: "9:00 AM" },
    { name: "John Dela Cruz", date: "Oct 18, 2025", time: "2:30 PM" },
    { name: "Ana Reyes", date: "Oct 20, 2025", time: "10:15 AM" },
  ];

  const surgeries = [
    { name: "Roberto Garcia", date: "Oct 12, 2025", time: "8:00 AM" },
    { name: "Carmen Villanueva", date: "Oct 16, 2025", time: "1:00 PM" },
    { name: "Jose Mendoza", date: "Oct 22, 2025", time: "11:30 AM" },
  ];

  const consultations = [
    { name: "Elena Torres", date: "Oct 10, 2025", time: "3:00 PM" },
    { name: "Michael Lopez", date: "Oct 14, 2025", time: "9:30 AM" },
    { name: "Patricia Rodriguez", date: "Oct 19, 2025", time: "4:15 PM" },
  ];

  const toothCleaning = [
    { name: "David Fernandez", date: "Oct 11, 2025", time: "10:00 AM" },
    { name: "Lisa Martinez", date: "Oct 17, 2025", time: "2:00 PM" },
    { name: "Carlos Ramos", date: "Oct 21, 2025", time: "11:00 AM" },
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Reports</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="rep-grid">
            <Category title="Dental Exams" color="#FFA64D" appointments={dentalExams} />
            <Category title="Surgeries" color="#FF6B6B" appointments={surgeries} />
            <Category title="Consultations" color="#77D2FF" appointments={consultations} />
            <Category title="Tooth Cleaning" color="#8EE08E" appointments={toothCleaning} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;


