import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"
import logoImage from "./Images/logo.webp";


const SuperAdminLogin = () => {
    const navigate = useNavigate();
    const [adminUsername, setAdminUsername] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Super Admin credentials (in production, validate against Firestore)
    const SUPER_ADMIN_USERNAME = "superadmin";
    const SUPER_ADMIN_PASSWORD = "SuperAdmin@123";

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!adminUsername.trim() || !adminPassword.trim()) {
            setErrorMessage("Username and password are required.");
            return;
        }

        // Basic validation - in production, validate against Firestore
        if (adminUsername === SUPER_ADMIN_USERNAME && adminPassword === SUPER_ADMIN_PASSWORD) {
            setErrorMessage("");
            // Store admin session
            localStorage.setItem("superAdminLoggedIn", "true");
            localStorage.setItem("superAdminUsername", adminUsername);
            navigate("/super-admin");
        } else {
            setErrorMessage("Invalid super admin credentials.");
        }
    };

    const handleBackToStaffLogin = () => {
        navigate("/");
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <header className="header">
                  <img src={logoImage} className="logo" alt="Menchie's Dental Clinic Logo" />  
                  <h1 className="title">Menchie's Dental Clinic</h1>
                  <h1 className="subtitle">Super Admin Login</h1>
                </header>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    <input
                      type="text"
                      placeholder="Admin Username"
                      className={`form-input${errorMessage && !adminUsername.trim() ? " input-error" : ""}`}
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Admin Password"
                      className={`form-input${errorMessage && !adminPassword.trim() ? " input-error" : ""}`}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />

                    {errorMessage && (
                      <div className="error-message" role="alert">{errorMessage}</div>
                    )}
                    
                    <button type="submit" className="login-button">
                        Super Admin Login
                    </button>
                </form>

                <div className="login-footer">
                    <button 
                      type="button" 
                      className="back-button"
                      onClick={handleBackToStaffLogin}
                    >
                        ← Back to Staff Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminLogin;
