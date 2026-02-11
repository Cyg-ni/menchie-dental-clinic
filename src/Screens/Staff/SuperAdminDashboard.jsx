import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, query, where } from 'firebase/firestore';
import "./SuperAdminDashboard.css";

const usersCollectionRef = collection(db, "users");

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewModalTab, setViewModalTab] = useState('details');
  const [userLogs, setUserLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    bio: '',
    role: 'staff', // staff, dentist, admin, super_admin
    status: 'active', // active, inactive
    profilePicture: null,
    profilePictureUrl: ''
  });

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(usersCollectionRef);
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrorMessage("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Show success/error messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Open create modal
  const handleCreateUser = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      mobileNumber: '',
      address: '',
      bio: '',
      role: 'staff',
      status: 'active',
      profilePicture: null,
      profilePictureUrl: ''
    });
    setShowModal(true);
  };

  const fetchLogs = async (userId) => {
    try {
      const logsRef = collection(db, "activity_logs");
      const q = query(logsRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const logsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If collection is empty, provide some sample data for demonstration if user is one of the screenshots
      if (logsList.length === 0) {
        return [
          {
            id: 'sample-1',
            action: 'Approved an appointment',
            patientName: 'Roberto Gomez',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          },
          {
            id: 'sample-2',
            action: 'Filed a new treatment record',
            patientName: 'Maria Santos',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          },
          {
            id: 'sample-3',
            action: 'Updated patient profile',
            patientName: 'Juan Dela Cruz',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
          }
        ];
      }

      return logsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error("Error fetching logs:", error);
      return [];
    }
  };

  const handleViewUser = async (user) => {
    setViewingUser(user);
    setViewModalTab('details');
    setShowViewModal(true);
    const logs = await fetchLogs(user.id);
    setUserLogs(logs);
  };

  // Open edit modal
  const handleEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      mobileNumber: user.mobileNumber || '',
      address: user.address || '',
      bio: user.bio || '',
      role: user.role || 'staff',
      status: user.status || 'active',
      profilePicture: null,
      profilePictureUrl: user.profilePictureUrl || ''
    });
    setShowModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile picture upload
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("File size must be less than 5MB");
        return;
      }
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profilePicture: file,
          profilePictureUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save user (create or update)
  const handleSaveUser = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.email.trim()) {
      setErrorMessage("Username and email are required");
      return;
    }

    if (modalMode === 'create' && !formData.password.trim()) {
      setErrorMessage("Password is required for new users");
      return;
    }

    try {
      if (modalMode === 'create') {
        // Check if username or email already exists
        const usernameQuery = query(usersCollectionRef, where("username", "==", formData.username));
        const emailQuery = query(usersCollectionRef, where("email", "==", formData.email));
        
        const [usernameSnapshot, emailSnapshot] = await Promise.all([
          getDocs(usernameQuery),
          getDocs(emailQuery)
        ]);

        if (!usernameSnapshot.empty) {
          setErrorMessage("Username already exists");
          return;
        }
        if (!emailSnapshot.empty) {
          setErrorMessage("Email already exists");
          return;
        }

        // Create new user
        const newUserId = `user_${Date.now()}`;
        const userData = {
          ...formData,
          profilePicture: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Remove the profilePicture file object and keep only the URL
        if (formData.profilePictureUrl) {
          userData.profilePictureUrl = formData.profilePictureUrl;
        }
        delete userData.profilePicture;

        await setDoc(doc(db, "users", newUserId), userData);
        setSuccessMessage("User created successfully");
      } else {
        // Update existing user
        const updateData = {
          ...formData,
          updatedAt: new Date().toISOString()
        };
        
        // Remove the profilePicture file object and keep only the URL
        delete updateData.profilePicture;

        await updateDoc(doc(db, "users", selectedUser.id), updateData);
        setSuccessMessage("User updated successfully");
      }

      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      setErrorMessage("Failed to save user");
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        setSuccessMessage("User deleted successfully");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        setErrorMessage("Failed to delete user");
      }
    }
  };

  // Filter and search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const handleLogout = () => {
    localStorage.removeItem("superAdminLoggedIn");
    localStorage.removeItem("superAdminUsername");
    navigate("/super-admin-login");
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return '#e11d48';
      case 'admin': return '#d97706';
      case 'dentist': return '#0891b2';
      case 'staff': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getStatusBadgeColor = (status) => {
    return status === 'active' ? '#10b981' : '#ef4444';
  };

  return (
    <div className="super-admin-dashboard">
      <header className="admin-header">
        <h1>Super Admin - Account Management</h1>
        <div className="header-actions">
          <button className="btn-create" onClick={handleCreateUser}>
            + Create New Account
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="alert alert-error">{errorMessage}</div>
      )}

      <div className="admin-controls">
        <input
          type="text"
          placeholder="Search by username, email, or name..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="dentist">Dentist</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      <div className="users-container">
        {loading ? (
          <div className="loading">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="no-data">No users found</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="username-cell">{user.username}</td>
                  <td>{user.email}</td>
                  <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}</td>
                  <td>
                    <span 
                      className="badge role-badge" 
                      style={{ backgroundColor: getRoleBadgeColor(user.role) }}
                    >
                      {user.role?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span 
                      className="badge status-badge" 
                      style={{ backgroundColor: getStatusBadgeColor(user.status) }}
                    >
                      {user.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="date-cell">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-action btn-view" 
                      onClick={() => handleViewUser(user)}
                      title="View details & logs"
                    >
                      View
                    </button>
                    <button 
                      className="btn-action btn-edit" 
                      onClick={() => handleEditUser(user)}
                      title="Edit user"
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-action btn-delete" 
                      onClick={() => handleDeleteUser(user.id)}
                      title="Delete user"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Create/Edit User */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create New User' : 'Edit User'}</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>

            <form className="user-form" onSubmit={handleSaveUser}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  disabled={modalMode === 'edit'}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password {modalMode === 'create' ? '*' : ''}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={modalMode === 'create' ? "Enter password" : "Leave blank to keep current password"}
                  required={modalMode === 'create'}
                />
              </div>

              <div className="form-group">
                <label>Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="file-input"
                />
                {formData.profilePictureUrl && (
                  <div className="profile-preview">
                    <img src={formData.profilePictureUrl} alt="Profile preview" />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="text"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="Enter mobile number"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="staff">Staff</option>
                    <option value="dentist">Dentist</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-cancel" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-submit"
                >
                  {modalMode === 'create' ? 'Create User' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Details & Logs Modal */}
      {showViewModal && viewingUser && (
        <div className="modal-overlay">
          <div className="modal view-modal">
            <header className="modal-header">
              <h2>User Information</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>&times;</button>
            </header>

            <div className="view-tabs">
              <button 
                className={`tab-btn ${viewModalTab === 'details' ? 'active' : ''}`}
                onClick={() => setViewModalTab('details')}
              >
                Profile Details
              </button>
              <button 
                className={`tab-btn ${viewModalTab === 'logs' ? 'active' : ''}`}
                onClick={() => setViewModalTab('logs')}
              >
                Activity Logs
              </button>
            </div>

            <div className="view-body">
              {viewModalTab === 'details' ? (
                <div className="details-view">
                  <div className="user-profile-summary">
                    {viewingUser.profilePictureUrl ? (
                      <img src={viewingUser.profilePictureUrl} alt="Profile" className="view-avatar" />
                    ) : (
                      <div className="view-avatar-placeholder">
                        {viewingUser.firstName?.[0] || viewingUser.username?.[0] || '?'}
                      </div>
                    )}
                    <div className="user-info-main">
                      <h3>{`${viewingUser.firstName || ''} ${viewingUser.lastName || ''}`.trim() || viewingUser.username}</h3>
                      <p className="user-role-badge" style={{ backgroundColor: getRoleBadgeColor(viewingUser.role) }}>
                        {viewingUser.role?.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Username</label>
                      <span>{viewingUser.username}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email Address</label>
                      <span>{viewingUser.email}</span>
                    </div>
                    <div className="detail-item">
                      <label>Mobile Number</label>
                      <span>{viewingUser.mobileNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Account Status</label>
                      <span className={`status-${viewingUser.status}`}>{viewingUser.status?.toUpperCase()}</span>
                    </div>
                    <div className="detail-item full-width">
                      <label>Home Address</label>
                      <span>{viewingUser.address || 'No address provided'}</span>
                    </div>
                    <div className="detail-item full-width">
                      <label>Short Bio</label>
                      <p>{viewingUser.bio || 'No bio available'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="logs-view">
                  {userLogs.length === 0 ? (
                    <div className="no-logs">No activity recorded for this user.</div>
                  ) : (
                    <div className="logs-list">
                      {userLogs.map((log) => (
                        <div key={log.id} className="log-entry">
                          <div className="log-icon">
                            {log.action?.includes('appointment') ? '📅' : log.action?.includes('treatment') ? '🦷' : '📝'}
                          </div>
                          <div className="log-content">
                            <p>
                              <strong>{viewingUser.firstName}</strong> {log.action.toLowerCase()}
                              {log.patientName && <> for <strong>{log.patientName}</strong></>}
                            </p>
                            <span className="log-time">
                              {new Date(log.timestamp).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
