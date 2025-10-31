import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Screens/Staff/Login.jsx";
import MainDashboard from "./Screens/Staff/MainDashboard.jsx";
import ScheduleDashboard from "./Screens/Staff/ScheduleDashboard.jsx";
import PatientList from "./Screens/Staff/PatientList.jsx";
import PatientProfile from "./Screens/Staff/PatientProfile.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/schedule" element={<ScheduleDashboard />} />
        <Route path="/patient-list" element={<PatientList />} />
        <Route path="/patient-list/:id" element={<PatientProfile />} />
      </Routes>
    </Router>
  );
}

export default App;