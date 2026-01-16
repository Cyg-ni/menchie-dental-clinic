import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Screens/Staff/Login.jsx";
import SuperAdminLogin from "./Screens/Staff/SuperAdminLogin.jsx";
import MainDashboard from "./Screens/Staff/MainDashboard.jsx";
import ScheduleDashboard from "./Screens/Staff/ScheduleDashboard.jsx";
import PatientList from "./Screens/Staff/PatientList.jsx";
import PatientProfile from "./Screens/Staff/PatientProfile.jsx";
import Settings from "./Screens/Staff/Settings.jsx";
import SuperAdminDashboard from "./Screens/Staff/SuperAdminDashboard.jsx";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/schedule" element={<ScheduleDashboard />} />
        
        {/* Patient List */}
        <Route path="/patient-list" element={<PatientList />} />
        
        {/* Patient Profile: Uses the :id parameter to load the specific patient */}
        {/* FIX 1: Changed the path base from /patient-list/:id to /patient-profile/:id to match the URL you are using. */}
        <Route path="/patient-profile/:id/*" element={<PatientProfile />} />
        
        {/* FIX 2: Added a specific route for the /odontogram segment.
          This handles the URL "/patient-profile/KPKs4hh00duZE2H5qlQz/odontogram" 
        */}
        <Route path="/patient-profile/:id/odontogram" element={<PatientProfile />} />
        
        <Route path="/settings" element={<Settings />} />
        
        {/* Super Admin Dashboard - Account Management */}
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        
      </Routes>
    </Router>
  );
}

export default App;