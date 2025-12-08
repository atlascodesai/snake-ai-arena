/**
 * Leaderboard Page
 * Displays both Manual Play and AI Arena leaderboards
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, LeaderboardEntry, ManualScoreEntry } from '../api/client';

type LeaderboardType = 'manual' | 'ai';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<LeaderboardType>(
    (searchParams.get('tab') as LeaderboardType) || 'manual'
  );
  const [menuOpen, setMenuOpen] = useState(false);

  // Data state
  const [manualScores, setManualScores] = useState<ManualScoreEntry[]>([]);
  const [aiSubmissions, setAiSubmissions] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update URL when tab changes
  const handleTabChange = (tab: LeaderboardType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [manual, ai] = await Promise.all([
          api.getManualLeaderboard(),
          api.getLeaderboard(),
        ]);
        setManualScores(manual);
        setAiSubmissions(ai);
      } catch (error) {
        console.error('Failed to fetch leaderboards:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="border-b border-dark-700 px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1">
                    <button
                      onClick={() => { navigate('/'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🏠</span><span>Arena Home</span>
                    </button>
                    <button
                      onClick={() => { navigate('/editor'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>✏️</span><span>Editor</span>
                    </button>
                    <button
                      onClick={() => { navigate('/play'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🎮</span><span>Manual Play</span>
                    </button>
                    <button
                      onClick={() => { navigate('/leaderboard'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-neon-green hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🏆</span><span>Leaderboard</span>
                    </button>
                    <hr className="my-1 border-dark-700" />
                    <button
                      onClick={() => { navigate('/about'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-gray-400 hover:bg-dark-700 hover:text-white flex items-center gap-2"
                    >
                      <span>ℹ️</span><span>About</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <span className="text-lg md:text-xl">🏆</span>
            <h1 className="text-sm md:text-base font-bold">Leaderboard</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/play')}
              className="px-4 py-2 bg-neon-green text-dark-900 font-semibold rounded-lg hover:bg-neon-green/90 transition-colors text-sm"
            >
              Play Now
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleTabChange('manual')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === 'manual'
                ? 'bg-neon-pink text-white'
                : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span className="mr-2">🎮</span>
            Manual Play
            <span className="ml-2 text-sm opacity-70">({manualScores.length})</span>
          </button>
          <button
            onClick={() => handleTabChange('ai')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === 'ai'
                ? 'bg-neon-blue text-white'
                : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <span className="mr-2">🤖</span>
            AI Arena
            <span className="ml-2 text-sm opacity-70">({aiSubmissions.length})</span>
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full mx-auto mb-4" />
            Loading leaderboard...
          </div>
        )}

        {/* Manual Play Leaderboard */}
        {!isLoading && activeTab === 'manual' && (
          <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            {manualScores.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">🎮</div>
                <div className="text-lg mb-2">No scores yet!</div>
                <div className="text-sm">Be the first to submit a score.</div>
                <button
                  onClick={() => navigate('/play')}
                  className="mt-4 px-6 py-2 bg-neon-pink text-white font-semibold rounded-lg hover:bg-neon-pink/90 transition-colors"
                >
                  Play Now
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-dark-700 text-gray-400 text-sm">
                  <tr>
                    <th className="py-3 px-4 text-left w-16">#</th>
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-right">Score</th>
                    <th className="py-3 px-4 text-right hidden sm:table-cell">Length</th>
                    <th className="py-3 px-4 text-right hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {manualScores.map((score, index) => (
                    <tr
                      key={score.id}
                      className={`border-t border-dark-700 ${
                        index < 3 ? 'bg-dark-700/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        {index === 0 && <span className="text-yellow-400 text-lg">🥇</span>}
                        {index === 1 && <span className="text-gray-300 text-lg">🥈</span>}
                        {index === 2 && <span className="text-amber-600 text-lg">🥉</span>}
                        {index > 2 && <span className="text-gray-500">{score.rank}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-lg tracking-wider text-neon-pink">
                          {score.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-neon-green">{score.score.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400 hidden sm:table-cell">
                        {score.length}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 text-sm hidden md:table-cell">
                        {new Date(score.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* AI Arena Leaderboard */}
        {!isLoading && activeTab === 'ai' && (
          <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            {aiSubmissions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">🤖</div>
                <div className="text-lg mb-2">No AI submissions yet!</div>
                <div className="text-sm">Be the first to submit an algorithm.</div>
                <button
                  onClick={() => navigate('/editor')}
                  className="mt-4 px-6 py-2 bg-neon-blue text-white font-semibold rounded-lg hover:bg-neon-blue/90 transition-colors"
                >
                  Open Editor
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-dark-700 text-gray-400 text-sm">
                  <tr>
                    <th className="py-3 px-4 text-left w-16">#</th>
                    <th className="py-3 px-4 text-left">Algorithm</th>
                    <th className="py-3 px-4 text-right">Avg Score</th>
                    <th className="py-3 px-4 text-right hidden sm:table-cell">Max</th>
                    <th className="py-3 px-4 text-right hidden md:table-cell">Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {aiSubmissions.map((sub, index) => (
                    <tr
                      key={sub.id}
                      className={`border-t border-dark-700 hover:bg-dark-700/50 cursor-pointer ${
                        index < 3 ? 'bg-dark-700/30' : ''
                      }`}
                      onClick={() => navigate(`/?selected=${sub.id}`)}
                    >
                      <td className="py-3 px-4">
                        {index === 0 && <span className="text-yellow-400 text-lg">🥇</span>}
                        {index === 1 && <span className="text-gray-300 text-lg">🥈</span>}
                        {index === 2 && <span className="text-amber-600 text-lg">🥉</span>}
                        {index > 2 && <span className="text-gray-500">{sub.rank}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{sub.name}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-neon-green">{Math.round(sub.avgScore).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-neon-blue hidden sm:table-cell">
                        {sub.maxScore.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400 hidden md:table-cell">
                        {sub.linesOfCode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Info section */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          {activeTab === 'manual' ? (
            <p>Play manually and submit your high score with 3-letter initials!</p>
          ) : (
            <p>AI algorithms compete over 10 games. Best average score wins!</p>
          )}
        </div>
      </main>
    </div>
  );
}
