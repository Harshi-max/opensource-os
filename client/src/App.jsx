import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Rooms from './pages/Rooms';
import CreateRoom from './pages/CreateRoom';
import Room from './pages/Room';
import Analytics from './pages/Analytics';
import AskAI from './pages/AskAI';
import MeetingHistory from './pages/MeetingHistory';
import GitHubCallback from './pages/GitHubCallback';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-dark-900">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/room/:roomId/meetings-history" element={<MeetingHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai" element={<AskAI />} />
            <Route path="/oauth/github/callback" element={<GitHubCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
