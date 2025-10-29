import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Screens/Staff/Login.jsx";
import MainDashboard from "./Screens/Staff/MainDashboard.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<MainDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;