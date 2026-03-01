import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Challenge from './pages/Challenge';
import Settings from './pages/Settings';
import PhoneDemo from './pages/PhoneDemo';
import Progress from './pages/Progress';
import Diet from './pages/Diet';
import Social from './pages/Social';
import './App.css';

export default function App() {
  return (
    <Router>
      <div className="app-shell">
        <div className="safe-top" />
        <main className="main-content">
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/demo"      element={<PhoneDemo />} />
            <Route path="/diet"      element={<Diet />} />
            <Route path="/progress"  element={<Progress />} />
            <Route path="/challenge" element={<Challenge />} />
            <Route path="/social"    element={<Social />} />
            <Route path="/settings"  element={<Settings />} />
          </Routes>
        </main>
        <Navbar />
      </div>
    </Router>
  );
}
