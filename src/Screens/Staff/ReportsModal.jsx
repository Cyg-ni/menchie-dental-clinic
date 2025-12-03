import React from "react";
import "./ReportsModal.css";

// 1. Helper function to format date and time strings (e.g., "Oct 15, 2025 • 9:00 AM")
const formatAppointmentDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return "N/A";

    // Parse YYYY-MM-DD string into local date components (to avoid timezone shift issues)
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); 

    const dateFormatted = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });

    // Parse HH:MM string for time formatting (using a dummy date base)
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Use dummy January 1st to format time correctly
    const timeObj = new Date(2000, 0, 1, hours, minutes);
    
    // Ensure we handle potential errors if time is invalid
    if (isNaN(timeObj.getTime())) return `${dateFormatted} • N/A`;

    const timeFormatted = timeObj.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });

    return `${dateFormatted} • ${timeFormatted}`;
};

const Category = ({ title, appointments, color }) => (
  <div className="rep-cat">
    <div className="rep-cat-title" style={{ borderColor: color }}>{title}</div>
    <ul className="rep-cat-list">
      {appointments.length === 0 ? (
          <li className="rep-item">No appointments found in this category.</li>
      ) : (
          appointments.map((apt) => (
            <li key={apt.id} className="rep-item">
              <span className="dot" style={{ background: color }} />
              <div className="rep-item-content">
                <div className="rep-item-name">{apt.patientFullName || "Unknown Patient"}</div>
                <div className="rep-item-info">
                    {formatAppointmentDateTime(apt.scheduledDate, apt.scheduledTime)}
                </div>
              </div>
            </li>
          ))
      )}
    </ul>
  </div>
);


// ACCEPT displayDate PROP
const ReportsModal = ({ onClose, appointments = [], displayDate }) => {
    
    // Use the passed displayDate instead of new Date()
    const targetDate = displayDate || new Date(); // Fallback to current date
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // 1-indexed month for comparison
    
    // Get the month name for the modal title
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // 1. Filter appointments to only include those in the target month
    const filteredAppointments = React.useMemo(() => {
        return appointments.filter(apt => {
            const dateStr = apt.scheduledDate; // Format: YYYY-MM-DD
            if (!dateStr) return false;

            const parts = dateStr.split('-');
            if (parts.length < 3) return false;
            
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            
            return year === targetYear && month === targetMonth;
        });
    }, [appointments, targetYear, targetMonth]); // Dependency cleanup

    // 2. Define how service types map to the four display categories
    const serviceCategories = {
        'Dental Exams': ['Teeth Whitening (Cosmetic)', 'Orthodontics Consultation'],
        'Surgeries': ['Emergency Visit (Pain/Injury)'],
        'Consultations': ['Dental Implants Consultation', 'Other / Not Sure'],
        'Tooth Cleaning': ['Routine Check-up & Cleaning'],
    };

    // 3. Group and process the filtered appointments
    const groupedAppointments = React.useMemo(() => {
        const groups = {
            'Dental Exams': [],
            'Surgeries': [],
            'Consultations': [],
            'Tooth Cleaning': [],
        };
        
        // Map of known services to their group title
        const reverseLookup = {};
        Object.entries(serviceCategories).forEach(([title, services]) => {
            services.forEach(service => {
                reverseLookup[service] = title;
            });
        });

        // Iterate over the filtered list
        filteredAppointments.forEach(apt => {
            const serviceType = apt.serviceType;
            const groupTitle = reverseLookup[serviceType];
            
            if (groupTitle) {
                groups[groupTitle].push(apt);
            } else {
                // Fallback to Consultations
                groups['Consultations'].push(apt);
            }
        });
        
        // Optional: Sort appointments within each group by date/time
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                // Use scheduledDate and scheduledTime for sorting
                const dateA = `${a.scheduledDate} ${a.scheduledTime || '00:00'}`;
                const dateB = `${b.scheduledDate} ${b.scheduledTime || '00:00'}`;
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
                return 0;
            });
        });

        return groups;
    }, [filteredAppointments]);


  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          {/* Updated Title */}
          <div className="modal-title">Reports (Scheduled Appointments for {monthName})</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="rep-grid">
            <Category 
                title="Dental Exams" 
                color="#FFA64D" 
                appointments={groupedAppointments['Dental Exams']} 
            />
            <Category 
                title="Surgeries" 
                color="#FF6B6B" 
                appointments={groupedAppointments['Surgeries']} 
            />
            <Category 
                title="Consultations" 
                color="#77D2FF" 
                appointments={groupedAppointments['Consultations']} 
            />
            <Category 
                title="Tooth Cleaning" 
                color="#8EE08E" 
                appointments={groupedAppointments['Tooth Cleaning']} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;