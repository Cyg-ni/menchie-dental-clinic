import React, { useState } from 'react';
import LoginPage from './LoginPage';
import UserDashboard from './UserDashboard';
import StaffDashboard from './StaffDashboard';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);

  const handleLogin = (user, type) => {
    setCurrentUser(user);
    setUserType(type);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserType(null);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      {userType === 'user' ? (
        <UserDashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <StaffDashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
