import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import "./Login.css"
import logoImage from "./Images/logo.webp";

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        ),
    ]);
};

const INACTIVE_AFTER_DAYS = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getUserActivityDate = (user) => {
    if (user.lastActivityAt?.toDate) {
        return user.lastActivityAt.toDate();
    }

    if (user.lastLoginAt?.toDate) {
        return user.lastLoginAt.toDate();
    }

    if (user.updatedAt) {
        const updatedAtDate = new Date(user.updatedAt);
        if (!Number.isNaN(updatedAtDate.getTime())) {
            return updatedAtDate;
        }
    }

    if (user.createdAt) {
        const createdAtDate = new Date(user.createdAt);
        if (!Number.isNaN(createdAtDate.getTime())) {
            return createdAtDate;
        }
    }

    return null;
};


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
            const querySnapshot = await withTimeout(
                getDocs(q),
                10000,
                "Login request timed out. Please check your internet connection."
            );

            if (querySnapshot.empty) {
                setErrorMessage("Invalid username or password.");
                setLoading(false);
                return;
            }

            const user = querySnapshot.docs[0].data();
            const userId = querySnapshot.docs[0].id;

            const activityDate = getUserActivityDate(user);
            const inactivityDays = activityDate ? (Date.now() - activityDate.getTime()) / DAY_IN_MS : null;
            const shouldAutoInactivate = inactivityDays !== null && inactivityDays >= INACTIVE_AFTER_DAYS;

            if (shouldAutoInactivate && user.status !== 'inactive') {
                updateDoc(doc(db, "users", userId), {
                    status: 'inactive',
                    inactiveAt: Timestamp.fromDate(new Date()),
                    inactiveReason: 'Automatic inactivity policy',
                    updatedAt: new Date().toISOString()
                }).catch((error) => {
                    console.warn("Unable to auto-inactivate stale account:", error);
                });

                setErrorMessage("Your account has been set to inactive because it has not been opened for 3 days. Please contact an administrator.");
                setLoading(false);
                return;
            }

            // Check if user is active
            if (user.status !== 'active') {
                setErrorMessage("Your account is not active. Please contact an administrator.");
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

            // Non-blocking: if this write is slow/fails, user should still be able to proceed.
            updateDoc(doc(db, "users", userId), {
                lastLoginAt: Timestamp.fromDate(new Date()),
                lastActivityAt: Timestamp.fromDate(new Date()),
                lastActivityAction: 'Login',
                updatedAt: new Date().toISOString()
            }).catch((error) => {
                console.warn("Unable to update login activity:", error);
            });
        } catch (error) {
            console.error("Error logging in:", error);
            setErrorMessage(error?.message || "An error occurred. Please try again.");
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