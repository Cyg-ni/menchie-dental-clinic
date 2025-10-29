import React from 'react';
import './StaffDashboard.css';

const StaffDashboard = ({ user, onLogout }) => {
  const todayAppointments = [
    { id: 1, time: '09:00 AM', patient: 'John Smith', service: 'General Consultation', status: 'confirmed' },
    { id: 2, time: '10:30 AM', patient: 'Sarah Johnson', service: 'X-Ray', status: 'in-progress' },
    { id: 3, time: '02:00 PM', patient: 'Mike Wilson', service: 'Blood Test', status: 'pending' },
    { id: 4, time: '03:30 PM', patient: 'Emily Davis', service: 'Vaccination', status: 'confirmed' }
  ];

  const stats = [
    { label: 'Today\'s Appointments', value: '12', icon: '📅' },
    { label: 'Pending Reviews', value: '5', icon: '📋' },
    { label: 'Emergency Cases', value: '2', icon: '🚨' },
    { label: 'Available Rooms', value: '8', icon: '🏥' }
  ];

  return (
    <div className="staff-dashboard">
      <nav className="navbar">
        <div className="navbar-brand">MediBridge Staff</div>
        <div className="navbar-nav">
          <span className="user-info">Welcome, {user.name}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Staff Dashboard</h1>
          <p>Manage appointments and patient care efficiently</p>
        </div>

        {/* Stats Overview */}
        <div className="stats-section">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-info">
                  <h3>{stat.value}</h3>
                  <p>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="appointments-section">
          <h2>Today's Appointments</h2>
          <div className="appointments-list">
            {todayAppointments.map((appointment) => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-time">
                  <span className="time">{appointment.time}</span>
                </div>
                <div className="appointment-info">
                  <h4>{appointment.patient}</h4>
                  <p>{appointment.service}</p>
                </div>
                <div className="appointment-status">
                  <span className={`status ${appointment.status}`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                </div>
                <div className="appointment-actions">
                  <button className="btn-small btn-primary">View</button>
                  <button className="btn-small btn-secondary">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card">
              <div className="action-icon">👥</div>
              <h3>Patient Records</h3>
              <p>View and manage patient information</p>
            </button>
            <button className="action-card">
              <div className="action-icon">📊</div>
              <h3>Analytics</h3>
              <p>View clinic performance metrics</p>
            </button>
            <button className="action-card">
              <div className="action-icon">💊</div>
              <h3>Inventory</h3>
              <p>Manage medical supplies and equipment</p>
            </button>
            <button className="action-card">
              <div className="action-icon">📋</div>
              <h3>Reports</h3>
              <p>Generate and view medical reports</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
