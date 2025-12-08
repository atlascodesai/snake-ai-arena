import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import About from './pages/About';
import Play from './pages/Play';
import LeaderboardPage from './pages/Leaderboard';
import AIDemo from './pages/AIDemo';

function App() {
  return (
    <div className="min-h-screen bg-dark-900 overflow-auto">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/play" element={<Play />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/aidemo" element={<AIDemo />} />
      </Routes>
    </div>
  );
}

export default App;
