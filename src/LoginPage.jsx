import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('user');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Mock authentication - in real app, validate against backend
      if (email && password) {
        const user = {
          id: Date.now(),
          email: email,
          name: email.split('@')[0],
          type: userType
        };
        onLogin(user, userType);
      } else {
        alert('Please enter valid credentials');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>MediBridge</h1>
          <p>Your Healthcare Connection</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="user-type-selector">
            <button
              type="button"
              className={`type-btn ${userType === 'user' ? 'active' : ''}`}
              onClick={() => setUserType('user')}
            >
              Patient
            </button>
            <button
              type="button"
              className={`type-btn ${userType === 'staff' ? 'active' : ''}`}
              onClick={() => setUserType('staff')}
            >
              Staff
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo Credentials:</p>
          <p>Email: demo@medibridge.com | Password: demo123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
