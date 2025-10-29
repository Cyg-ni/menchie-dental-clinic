import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Screens/Staff/Login.jsx";
import MainDashboard from "./Screens/Staff/MainDashboard.jsx";
import ScheduleDashboard from "./Screens/Staff/ScheduleDashboard.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/schedule" element={<ScheduleDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;