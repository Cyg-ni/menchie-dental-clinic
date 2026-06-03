import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, query, where } from 'firebase/firestore';
import "./SuperAdminDashboard.css";

const usersCollectionRef = collection(db, "users");
const deletedRecordsCollectionRef = collection(db, "deleted_records");

const STATUS_OPTIONS = ['active', 'on-leave', 'inactive'];

const getStatusLabel = (status) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'on-leave':
      return 'On-Leave';
    case 'inactive':
      return 'Inactive';
    default:
      return status ? status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unknown';
  }
};

const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'active':
      return '#10b981';
    case 'on-leave':
      return '#d97706';
    case 'inactive':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

const formatRecoveryLabel = (record) => {
  if (record.sourceCollection === 'patients') {
    return record.data?.patient?.name || record.data?.patient?.patientName || record.originalId;
  }

  if (record.sourceCollection === 'users') {
    return record.data?.username || `${record.data?.firstName || ''} ${record.data?.lastName || ''}`.trim() || record.originalId;
  }

  if (record.sourceCollection === 'activity_logs') {
    return record.data?.action || record.originalId;
  }

  return record.originalId;
};

const formatRecoveryMeta = (record) => {
  if (record.sourceCollection === 'patients') {
    const conditionCount = record.data?.conditions?.length || 0;
    const treatmentCount = record.data?.treatments?.length || 0;
    return `${conditionCount} conditions, ${treatmentCount} treatments`;
  }

  if (record.sourceCollection === 'users') {
    return record.data?.role ? record.data.role.replace('_', ' ') : 'User record';
  }

  if (record.sourceCollection === 'activity_logs') {
    return record.data?.userName || 'Activity log';
  }

  return 'Archived record';
};

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
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveringRecordId, setRecoveringRecordId] = useState('');
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
    status: 'active', // active, on-leave, inactive
    profilePicture: null,
    profilePictureUrl: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [oldPassword, setOldPassword] = useState(''); // Track old password when editing

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

  const fetchDeletedRecords = useCallback(async () => {
    try {
      setRecoveryLoading(true);
      const snapshot = await getDocs(deletedRecordsCollectionRef);
      const recordsList = snapshot.docs.map((recordDoc) => ({
        id: recordDoc.id,
        ...recordDoc.data(),
      })).sort((a, b) => {
        const aTime = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
        const bTime = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
        return bTime - aTime;
      });

      setDeletedRecords(recordsList);
    } catch (error) {
      console.error('Error fetching deleted records:', error);
      setErrorMessage('Failed to load recovery vault');
    } finally {
      setRecoveryLoading(false);
    }
  }, []);

  const openRecoveryVault = async () => {
    setShowRecoveryModal(true);
    await fetchDeletedRecords();
  };

  const restoreArchivedRecord = async (record) => {
    if (!window.confirm(`Restore ${formatRecoveryLabel(record)}?`)) {
      return;
    }

    try {
      setRecoveringRecordId(record.id);

      if (record.sourceCollection === 'patients') {
        const patientData = record.data?.patient || {};
        const patientRef = doc(db, 'patients', record.originalId);
        await setDoc(patientRef, patientData);

        await Promise.all((record.data?.conditions || []).map(async (item) => {
          const { id, ...conditionData } = item;
          if (!id) return;
          await setDoc(doc(db, `patients/${record.originalId}/conditions`, id), conditionData);
        }));

        await Promise.all((record.data?.treatments || []).map(async (item) => {
          const { id, ...treatmentData } = item;
          if (!id) return;
          await setDoc(doc(db, `patients/${record.originalId}/treatments`, id), treatmentData);
        }));
      } else {
        await setDoc(doc(db, record.sourceCollection, record.originalId), record.data || {});
      }

      await deleteDoc(doc(db, 'deleted_records', record.id));
      await fetchDeletedRecords();

      if (record.sourceCollection === 'users') {
        await fetchUsers();
      }

      setSuccessMessage('Record restored successfully');
    } catch (error) {
      console.error('Error restoring record:', error);
      setErrorMessage('Failed to restore archived record');
    } finally {
      setRecoveringRecordId('');
    }
  };

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
    setFieldErrors({});
    setOldPassword('');
    setShowModal(true);
  };

  const fetchLogs = async (user) => {
    try {
      const logsRef = collection(db, "activity_logs");
      const byUserIdQuery = query(logsRef, where("userId", "==", user.id));
      const byUserIdSnapshot = await getDocs(byUserIdQuery);

      let rawLogs = byUserIdSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      // Backward-compatible fallback for older logs that may have no userId set.
      if (rawLogs.length === 0 && user.username) {
        const byUserNameQuery = query(logsRef, where("userName", "==", user.username));
        const byUserNameSnapshot = await getDocs(byUserNameQuery);
        rawLogs = byUserNameSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      }

      const normalizedLogs = rawLogs.map((log) => {
        let logDate = null;
        if (log.timestamp?.toDate) {
          logDate = log.timestamp.toDate();
        } else if (typeof log.timestamp === 'string' || typeof log.timestamp === 'number') {
          logDate = new Date(log.timestamp);
        } else if (log.createdAt) {
          logDate = new Date(log.createdAt);
        }

        return {
          ...log,
          patientName: log.patientName || log.metadata?.patientName || '',
          timestampDate: logDate && !Number.isNaN(logDate.getTime()) ? logDate : new Date(0),
        };
      });

      return normalizedLogs.sort((a, b) => b.timestampDate - a.timestampDate);
    } catch (error) {
      console.error("Error fetching logs:", error);
      return [];
    }
  };

  const handleViewUser = async (user) => {
    setViewingUser(user);
    setViewModalTab('details');
    setShowViewModal(true);
    const logs = await fetchLogs(user);
    setUserLogs(logs);
  };

  // Open edit modal
  const handleEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setOldPassword(user.password || '');
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
    setFieldErrors({});
    setShowModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    const updateFieldError = (fieldName, fieldValue) => {
      const error = validateField(fieldName, fieldValue);
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
      }));
    };

    if (name === 'firstName' || name === 'lastName') {
      const sanitizedValue = value.replace(/[^a-zA-Z\s'-]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: sanitizedValue
      }));

      if (value !== sanitizedValue) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: 'Only letters, spaces, hyphens, and apostrophes are allowed'
        }));
      } else {
        updateFieldError(name, sanitizedValue);
      }

      return;
    }

    if (name === 'mobileNumber') {
      const sanitizedValue = value.replace(/[^0-9+\-\s()]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: sanitizedValue
      }));

      if (value !== sanitizedValue) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: 'Only numbers and basic formatting characters (+, -, spaces, parentheses) are allowed'
        }));
      } else {
        updateFieldError(name, sanitizedValue);
      }

      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (['username', 'email', 'password', 'address'].includes(name)) {
      updateFieldError(name, value);
    }
  };

  // Handle current password input (for edit mode comparison)
  const handleCurrentPasswordChange = (e) => {
    const { value } = e.target;
    setOldPassword(value);
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

  // Real-time field validation
  const validateField = (fieldName, value) => {
    const trimmedValue = value.trim();

    switch (fieldName) {
      case 'username':
        if (!trimmedValue) return "Username is required";
        if (trimmedValue.length < 3) return "Username must be at least 3 characters";
        if (trimmedValue.length > 20) return "Username must not exceed 20 characters";
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedValue)) return "Only letters, numbers, underscores, hyphens allowed";
        return null;

      case 'email':
        if (!trimmedValue) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedValue)) return "Invalid email format";
        if (trimmedValue.length > 100) return "Email must not exceed 100 characters";
        return null;

      case 'password':
        if (modalMode === 'create' && !trimmedValue) return "Password is required";
        if (trimmedValue && trimmedValue.length < 6) return "Password must be at least 6 characters";
        if (trimmedValue && trimmedValue.length > 50) return "Password must not exceed 50 characters";
        // Check if new password is same as old password when editing
        if (modalMode === 'edit' && trimmedValue && trimmedValue === oldPassword) {
          return "Please enter a new password different from the existing one";
        }
        return null;

      case 'firstName':
        if (!trimmedValue) return "First name is required";
        if (trimmedValue.length < 2) return "First name must be at least 2 characters";
        if (trimmedValue.length > 50) return "First name must not exceed 50 characters";
        if (!/^[a-zA-Z\s'-]+$/.test(trimmedValue)) return "Only letters, spaces, hyphens, apostrophes allowed";
        return null;

      case 'lastName':
        if (!trimmedValue) return "Last name is required";
        if (trimmedValue.length < 2) return "Last name must be at least 2 characters";
        if (trimmedValue.length > 50) return "Last name must not exceed 50 characters";
        if (!/^[a-zA-Z\s'-]+$/.test(trimmedValue)) return "Only letters, spaces, hyphens, apostrophes allowed";
        return null;

      case 'mobileNumber':
        if (!trimmedValue) return "Mobile number is required";
        if (!/^[0-9+\-\s()]+$/.test(trimmedValue)) return "Invalid phone format";
        if (trimmedValue.replace(/\D/g, '').length < 7) return "Must contain at least 7 digits";
        if (trimmedValue.replace(/\D/g, '').length > 15) return "Must not exceed 15 digits";
        return null;

      case 'address':
        if (trimmedValue && trimmedValue.length > 200) return "Address must not exceed 200 characters";
        return null;

      default:
        return null;
    }
  };

  // Validation function for form data (complete validation)
  const validateFormData = () => {
    const errors = {};
    const fieldNames = ['username', 'email', 'password', 'firstName', 'lastName', 'mobileNumber', 'address'];

    fieldNames.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) errors[field] = error;
    });

    // Validate role
    const validRoles = ['staff', 'dentist', 'admin'];
    if (!validRoles.includes(formData.role)) {
      errors.role = "Invalid role selected";
    }

    // Validate status
    if (!STATUS_OPTIONS.includes(formData.status)) {
      errors.status = "Invalid status selected";
    }

    // Validate current password field when changing password in edit mode
    if (modalMode === 'edit' && formData.password.trim() && !oldPassword.trim()) {
      errors.currentPassword = "Current password is required when changing the password";
    }

    return errors;
  };

  // Save user (create or update)
  const handleSaveUser = async (e) => {
    e.preventDefault();

    // Perform validation
    const errors = validateFormData();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setErrorMessage(firstError);
      return;
    }
    setFieldErrors({}); // Clear field errors on successful validation

    try {
      if (modalMode === 'create') {
        // Check if username or email already exists
        const usernameQuery = query(usersCollectionRef, where("username", "==", formData.username.trim()));
        const emailQuery = query(usersCollectionRef, where("email", "==", formData.email.trim()));
        
        const [usernameSnapshot, emailSnapshot] = await Promise.all([
          getDocs(usernameQuery),
          getDocs(emailQuery)
        ]);

        if (!usernameSnapshot.empty) {
          setFieldErrors({ username: "Username already exists" });
          setErrorMessage("Username already exists");
          return;
        }
        if (!emailSnapshot.empty) {
          setFieldErrors({ email: "Email already exists" });
          setErrorMessage("Email already exists");
          return;
        }

        // Create new user
        const newUserId = `user_${Date.now()}`;
        const userData = {
          ...formData,
          username: formData.username.trim(),
          email: formData.email.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          address: formData.address.trim(),
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
          username: formData.username.trim(),
          email: formData.email.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          address: formData.address.trim(),
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

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const onLeaveUsers = users.filter(user => user.status === 'on-leave').length;
  const inactiveUsers = users.filter(user => user.status === 'inactive').length;
  const filteredCount = filteredUsers.length;

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

  return (
    <div className="super-admin-dashboard">
      <header className="admin-header">
        <div className="header-copy">
          <p className="eyebrow">Clinic administration</p>
          <h1>Super Admin - Account Management</h1>
        </div>
        <div className="header-actions">
          <button className="btn-create" onClick={handleCreateUser}>
            + Create New Account
          </button>
          <button className="btn-create" onClick={openRecoveryVault}>
            Recovery Vault
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="dashboard-hero">
        <div className="hero-panel hero-panel-primary">
          <span className="hero-label">Live overview</span>
          <h2>{totalUsers} total accounts in the system</h2>
          <p>
            Track operational access across the clinic and keep the team organized.
          </p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card metric-card-active">
            <span className="metric-label">Active</span>
            <strong>{activeUsers}</strong>
          </article>
          <article className="metric-card metric-card-on-leave">
            <span className="metric-label">On-Leave</span>
            <strong>{onLeaveUsers}</strong>
          </article>
          <article className="metric-card metric-card-inactive">
            <span className="metric-label">Inactive</span>
            <strong>{inactiveUsers}</strong>
          </article>
          <article className="metric-card metric-card-filtered">
            <span className="metric-label">Visible now</span>
            <strong>{filteredCount}</strong>
          </article>
        </div>
      </section>

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
                      {getStatusLabel(user.status)}
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
                  className={fieldErrors.username ? 'input-error' : ''}
                />
                {fieldErrors.username && (
                  <span className="field-error">{fieldErrors.username}</span>
                )}
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
                  className={fieldErrors.email ? 'input-error' : ''}
                />
                {fieldErrors.email && (
                  <span className="field-error">{fieldErrors.email}</span>
                )}
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
                  className={fieldErrors.password ? 'input-error' : ''}
                />
                {fieldErrors.password && (
                  <span className="field-error">{fieldErrors.password}</span>
                )}
              </div>

              {modalMode === 'edit' && formData.password && (
                <div className="form-group">
                  <label>Current Password (for verification) *</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={handleCurrentPasswordChange}
                    placeholder="Enter current password to verify"
                    className={fieldErrors.currentPassword ? 'input-error current-password-input' : 'current-password-input'}
                  />
                  {fieldErrors.currentPassword ? (
                    <span className="field-error">{fieldErrors.currentPassword}</span>
                  ) : (
                    <span className="field-hint">
                      Required when changing the password to verify you're making an intentional change
                    </span>
                  )}
                </div>
              )}

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
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className={fieldErrors.firstName ? 'input-error' : ''}
                  />
                  {fieldErrors.firstName && (
                    <span className="field-error">{fieldErrors.firstName}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    className={fieldErrors.lastName ? 'input-error' : ''}
                  />
                  {fieldErrors.lastName && (
                    <span className="field-error">{fieldErrors.lastName}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="text"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="Enter mobile number"
                  className={fieldErrors.mobileNumber ? 'input-error' : ''}
                />
                {fieldErrors.mobileNumber && (
                  <span className="field-error">{fieldErrors.mobileNumber}</span>
                )}
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete address"
                  className={fieldErrors.address ? 'input-error' : ''}
                />
                {fieldErrors.address && (
                  <span className="field-error">{fieldErrors.address}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className={fieldErrors.role ? 'input-error' : ''}
                  >
                    <option value="staff">Staff</option>
                    <option value="dentist">Dentist</option>
                    <option value="admin">Admin</option>
                  </select>
                  {fieldErrors.role && (
                    <span className="field-error">{fieldErrors.role}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className={fieldErrors.status ? 'input-error' : ''}
                  >
                    <option value="active">Active</option>
                    <option value="on-leave">On-Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  {fieldErrors.status && (
                    <span className="field-error">{fieldErrors.status}</span>
                  )}
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
                      <span className={`status-${viewingUser.status}`}>{getStatusLabel(viewingUser.status)}</span>
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
                              {(log.timestampDate || new Date(log.timestamp)).toLocaleString(undefined, {
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

      {showRecoveryModal && (
        <div className="modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="modal view-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Recovery Vault</h2>
              <button className="modal-close" onClick={() => setShowRecoveryModal(false)}>&times;</button>
            </header>

            <div className="view-body">
              {recoveryLoading ? (
                <div className="loading">Loading archived records...</div>
              ) : deletedRecords.length === 0 ? (
                <div className="no-logs">No archived records available for recovery.</div>
              ) : (
                <div className="recovery-vault-list">
                  {deletedRecords.map((record) => (
                    <div key={record.id} className="recovery-vault-item">
                      <div className="recovery-vault-copy">
                        <strong>{formatRecoveryLabel(record)}</strong>
                        <span>{record.sourceCollection?.replace('_', ' ')}</span>
                        <small>{formatRecoveryMeta(record)}</small>
                        <small>
                          Deleted: {record.archivedAt ? new Date(record.archivedAt).toLocaleString() : 'Unknown'}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn-action btn-edit"
                        onClick={() => restoreArchivedRecord(record)}
                        disabled={recoveringRecordId === record.id}
                      >
                        {recoveringRecordId === record.id ? 'Restoring...' : 'Restore'}
                      </button>
                    </div>
                  ))}
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
