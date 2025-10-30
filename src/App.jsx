import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Services from "./Screens/services"; // import Services component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Services />} /> {/* display Services instead of Home */}
      </Routes>
    </Router>
  );
}

export default App;
