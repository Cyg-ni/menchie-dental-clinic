import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Appointment from "./Screens/appointment"; // import Appointment component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Appointment />} /> {/* display Appointment instead of Home */}
      </Routes>
    </Router>
  );
}

export default App;
