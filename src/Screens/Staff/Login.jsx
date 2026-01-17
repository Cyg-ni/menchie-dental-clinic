import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, query, where } from 'firebase/firestore';
import "./Login.css"
import logoImage from "./Images/logo.webp";


const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setErrorMessage("Username and password are required.");
            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            const usersCollectionRef = collection(db, "users");
            const q = query(usersCollectionRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setErrorMessage("Invalid username or password.");
                setLoading(false);
                return;
            }

            const user = querySnapshot.docs[0].data();
            const userId = querySnapshot.docs[0].id;

            // Check if user is active
            if (user.status !== 'active') {
                setErrorMessage("Your account has been deactivated. Please contact an administrator.");
                setLoading(false);
                return;
            }

            // Verify password (simple comparison, in production use bcrypt)
            if (user.password !== password) {
                setErrorMessage("Invalid username or password.");
                setLoading(false);
                return;
            }

            // Store user info in localStorage
            localStorage.setItem("staffLoggedIn", "true");
            localStorage.setItem("staffUserId", userId);
            localStorage.setItem("staffUsername", user.username);
            localStorage.setItem("staffRole", user.role);
            localStorage.setItem("staffFirstName", user.firstName || "");
            localStorage.setItem("staffLastName", user.lastName || "");
            localStorage.setItem("staffProfilePictureUrl", user.profilePictureUrl || "");

            navigate("/dashboard");
        } catch (error) {
            console.error("Error logging in:", error);
            setErrorMessage("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
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
                    
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
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