import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import About from './pages/About';
import Play from './pages/Play';
import LeaderboardPage from './pages/Leaderboard';

function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/play" element={<Play />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}

export default App;
