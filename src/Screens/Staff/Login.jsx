import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"

const PlaceholderIcon = ({ className }) => (
  <div className={`placeholder-icon-container ${className || ''}`}>
    <svg width="55%" height="55%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 90 L40 50 L60 70 L95 90 Z" fill="#bbbbbb" />
      <circle cx="75" cy="35" r="12" fill="#bbbbbb" />
    </svg>
  </div>
);

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setErrorMessage("Username and password are required.");
            return;
        }
        setErrorMessage("");
        navigate("/dashboard");
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <header className="header">
                  <PlaceholderIcon className="logo" />  
                  <h1 className="title">Menchie's Dental Clinic</h1>
                  <h1 className="subtitle">Login</h1>
                </header>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    <input
                      type="text"
                      placeholder="Username"
                      className={`form-input${errorMessage && !username.trim() ? " input-error" : ""}`}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      className={`form-input${errorMessage && !password.trim() ? " input-error" : ""}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    {errorMessage && (
                      <div className="error-message" role="alert">{errorMessage}</div>
                    )}
                    
                    <button type="submit" className="login-button">
                        Login
                    </button>
                </form>

                <div className="forgot-password-container">
                    <a href= "#" className="forgot-password-link">
                        Forgot Password?
                    </a>
                </div>

                <section className="alt-logins-container">
                    <div className="alt-login-option">
                        <PlaceholderIcon className="alt-login-icon"/>
                        <span className="alt-login-text">Google Login</span>
                    </div>
                    <div className="alt-login-option">
                        <PlaceholderIcon className="alt-login-icon"/>
                        <span className="alt-login-text">Email Login</span>
                    </div>
                    <div className="alt-login-option">
                        <PlaceholderIcon className="alt-login-icon"/>
                        <span className="alt-login-text">SMS Login</span>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;