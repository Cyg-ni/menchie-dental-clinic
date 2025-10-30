import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Screens/Staff/Login.jsx";
import MainDashboard from "./Screens/Staff/MainDashboard.jsx";
import ScheduleDashboard from "./Screens/Staff/ScheduleDashboard.jsx";
import CalendarDashboard from "./Screens/Staff/CalendarDashboard.jsx";
import PatientList from "./Screens/Staff/PatientList.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/scheduledashboard" element={<ScheduleDashboard />} />
        <Route path="/calendardashboard" element={<CalendarDashboard />} />
        <Route path="/patientlist" element={<PatientList />} />
      </Routes>
    </Router>
  );
}

export default App;