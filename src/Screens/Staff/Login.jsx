import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"
import logoImage from "./Images/logo.webp";


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
                  <img src={logoImage} className="logo" alt="Menchie's Dental Clinic Logo" />  
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

                <div className="admin-login-section">
                    <p className="admin-text">Are you a Super Admin?</p>
                    <button 
                      type="button" 
                      className="admin-login-button"
                      onClick={() => navigate("/super-admin-login")}
                    >
                        Super Admin Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;