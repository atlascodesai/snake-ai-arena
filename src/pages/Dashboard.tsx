/**
 * Dashboard Page
 * Main landing page with leaderboard and live game viewer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GameViewerFPV from '../components/GameViewerFPV';
import Leaderboard from '../components/Leaderboard';
import AudioToggle from '../components/AudioToggle';
import { useAudio } from '../contexts/AudioContext';
import { api, LeaderboardEntry } from '../api/client';
import { GameState, Submission } from '../game/types';
import { GameController, compileAlgorithm } from '../game/AlgorithmRunner';
import { demoAlgorithm } from '../game/algorithms';
import { HeadlessGame } from '../game/HeadlessGame';

export default function Dashboard() {
  const navigate = useNavigate();
  const { startLoop, stopLoop, playWhammy, playWin, isMuted } = useAudio();
  const prevScoreRef = useRef(0);
  const [submissions, setSubmissions] = useState<LeaderboardEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: -2, y: 0, z: 0 }],
    food: { x: 5, y: 0, z: 0 },
    score: 0,
    frame: 0,
    gameOver: false,
    deathReason: null,
  });
  const [runCount, setRunCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const gameRef = useRef<HeadlessGame | null>(null);
  const intervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);


  // Stop audio when component unmounts (navigation away)
  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, [stopLoop]);

  // Start loop when user unmutes (if game is running)
  useEffect(() => {
    if (!isMuted && gameRef.current && !gameRef.current.getState().gameOver) {
      startLoop(150);
    }
  }, [isMuted, startLoop]);

  // Fetch leaderboard
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const data = await api.getLeaderboard();
        setSubmissions(data);

        // Auto-select first entry
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Fetch selected algorithm's code
  useEffect(() => {
    async function fetchCode() {
      if (!selectedId) {
        setSelectedCode(null);
        return;
      }

      try {
        const submission = await api.getSubmission(selectedId);
        setSelectedCode(submission.code);
      } catch (error) {
        console.error('Failed to fetch submission:', error);
        setSelectedCode(null);
      }
    }

    fetchCode();
  }, [selectedId]);

  // Start/restart game when algorithm changes
  useEffect(() => {
    // Clean up previous game
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Get algorithm function
    let algorithm = demoAlgorithm;
    if (selectedCode) {
      try {
        algorithm = compileAlgorithm(selectedCode);
      } catch (error) {
        console.error('Failed to compile algorithm:', error);
        algorithm = demoAlgorithm;
      }
    }

    // Reset stats
    setRunCount(0);
    setTotalScore(0);
    setScoreDelta(null);

    // Create new game
    const seed = Date.now();
    gameRef.current = new HeadlessGame(algorithm, seed);
    setGameState(gameRef.current.getState());

    // Start audio when game starts
    startLoop(150);
    prevScoreRef.current = 0;

    // Start game loop
    intervalRef.current = window.setInterval(() => {
      if (!gameRef.current) return;

      // Skip tick if paused (during countdown)
      if (isPausedRef.current) return;

      const state = gameRef.current.tick();
      setGameState(state);

      // Check if food was eaten
      if (state.score > prevScoreRef.current) {
        playWin();
        prevScoreRef.current = state.score;
      }

      if (state.gameOver) {
        // Play whammy sound and stop music
        stopLoop();
        playWhammy();

        // Record score
        setTotalScore(prev => prev + state.score);
        setRunCount(prev => {
          const newCount = prev + 1;

          // After 10 runs, calculate delta and reset
          if (newCount >= 10) {
            const avgScore = (totalScore + state.score) / 10;
            const selected = submissions.find(s => s.id === selectedId);
            if (selected) {
              setScoreDelta(Math.round(avgScore - selected.avgScore));
            }
            return 0;
          }
          return newCount;
        });

        // Restart game with new seed after short delay
        setTimeout(() => {
          const newSeed = Date.now();
          gameRef.current = new HeadlessGame(algorithm, newSeed);
          prevScoreRef.current = 0;
          startLoop(150);
        }, 800); // Wait for whammy sound to finish
      }
    }, 150);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopLoop();
    };
  }, [selectedCode, selectedId, startLoop, stopLoop, playWhammy, playWin]);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    setScoreDelta(null);
  }, []);

  const handleFork = useCallback((id: number) => {
    navigate(`/editor/${id}`);
  }, [navigate]);

  const handleNewAlgorithm = useCallback(() => {
    navigate('/editor');
  }, [navigate]);

  const selectedSubmission = submissions.find(s => s.id === selectedId);

  // Handle FPV toggle with countdown
  const handleToggleFPV = useCallback(() => {
    if (isFirstPerson) {
      // Switching back to orbit view - no countdown needed
      setIsFirstPerson(false);
      isPausedRef.current = false;
      setIsPaused(false);
      return;
    }

    // Switching to FPV - start countdown
    isPausedRef.current = true;
    setIsPaused(true);
    setCountdown(3);

    // Clear any existing countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    countdownRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Countdown finished
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          setIsFirstPerson(true);
          isPausedRef.current = false;
          setIsPaused(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isFirstPerson]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-dark-700 px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1">
                    <button
                      onClick={() => { navigate('/'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🏠</span>
                      <span>Arena Home</span>
                    </button>
                    <button
                      onClick={() => { navigate('/editor'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>✏️</span>
                      <span>Editor</span>
                    </button>
                    <button
                      onClick={() => { navigate('/play'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🎮</span>
                      <span>Manual Play</span>
                    </button>
                    <button
                      onClick={() => { navigate('/leaderboard'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                    >
                      <span>🏆</span>
                      <span>Leaderboard</span>
                    </button>
                    <hr className="my-1 border-dark-700" />
                    <button
                      onClick={() => { navigate('/about'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-gray-400 hover:bg-dark-700 hover:text-white flex items-center gap-2"
                    >
                      <span>ℹ️</span>
                      <span>About</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <span className="text-2xl md:text-3xl">🐍</span>
            <div>
              <h1 className="text-base md:text-xl font-bold text-white">Snake AI Arena</h1>
              <p className="text-xs md:text-sm text-gray-400 hidden sm:block">Build. Benchmark. Compete.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <AudioToggle />
            <button
              onClick={handleNewAlgorithm}
              className="px-2 py-1.5 md:px-4 md:py-2 bg-neon-green text-dark-900 text-sm md:text-base font-semibold rounded-lg hover:bg-neon-green/90 transition-colors flex items-center gap-1 md:gap-2"
            >
              <span>+</span>
              <span className="hidden sm:inline">New Algorithm</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content - full width like Editor */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Leaderboard - sidebar on desktop, below on mobile */}
        <aside className="flex-shrink-0 md:w-[400px] lg:w-[450px] border-b md:border-b-0 md:border-r border-dark-700 p-2 md:p-4 overflow-y-auto order-2 md:order-1 min-h-0 max-h-[40vh] md:max-h-none">
          <Leaderboard
            submissions={submissions.map(s => ({
              id: s.id,
              name: s.name,
              code: '',
              linesOfCode: s.linesOfCode,
              avgScore: s.avgScore,
              maxScore: s.maxScore,
              survivalRate: s.survivalRate,
              gamesPlayed: s.gamesPlayed,
              createdAt: s.createdAt,
            }))}
            selectedId={selectedId}
            onSelect={handleSelect}
            onFork={handleFork}
            isLoading={isLoading}
          />
        </aside>

        {/* Game viewer - main area */}
        <div className={`flex flex-col p-2 md:p-4 min-h-0 min-w-0 order-1 md:order-2 transition-all duration-300 ${
          isExpanded ? 'fixed inset-0 z-50 bg-dark-900 p-4' : 'flex-1'
        }`}>
            {/* Playing indicator */}
            <div className="flex-shrink-0 mb-2 md:mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-gray-300 text-sm md:text-base">
                  <span className="hidden sm:inline">Now playing: </span>
                  <span className="text-white font-semibold">{selectedSubmission?.name || 'Demo'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                {/* Run counter */}
                <div className="text-xs md:text-sm text-gray-400">
                  {runCount + 1}/10
                </div>

                {/* Score delta */}
                {scoreDelta !== null && (
                  <div className={`text-xs md:text-sm font-medium ${scoreDelta >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                    {scoreDelta >= 0 ? '+' : ''}{scoreDelta}
                  </div>
                )}

                {/* Expand/Collapse button */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-700 rounded transition-colors"
                  title={isExpanded ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isExpanded ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Game canvas */}
            <div className="flex-1 bg-dark-800 rounded-xl border border-dark-700 overflow-hidden min-h-0 relative">
              <GameViewerFPV
                gameState={gameState}
                className="w-full h-full"
                isFirstPerson={isFirstPerson}
                onToggleFPV={handleToggleFPV}
                showFPVToggle={true}
              />

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm z-10">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-neon-pink animate-pulse mb-4">
                      {countdown}
                    </div>
                    <div className="text-gray-300 text-lg">Entering FPV mode...</div>
                    <button
                      onClick={() => {
                        if (countdownRef.current) {
                          clearInterval(countdownRef.current);
                          countdownRef.current = null;
                        }
                        setCountdown(null);
                        isPausedRef.current = false;
                        setIsPaused(false);
                      }}
                      className="mt-4 px-4 py-2 text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Score/Length when expanded */}
            {isExpanded && (
              <div className="flex-shrink-0 mt-2 flex items-center justify-center gap-6 text-lg">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Score</span>
                  <span className="font-bold text-neon-green">{gameState.score}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Length</span>
                  <span className="font-bold text-white">{gameState.snake.length}</span>
                </div>
              </div>
            )}

            {/* Stats bar - 2 cols on mobile, 4 on desktop (hidden when expanded) */}
            {selectedSubmission && !isExpanded && (
              <div className="flex-shrink-0 mt-2 md:mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <div className="bg-dark-800 rounded-lg p-2 md:p-3 border border-dark-700">
                  <div className="text-[10px] md:text-xs text-gray-400">Avg Score</div>
                  <div className="text-base md:text-xl font-bold text-neon-green">{selectedSubmission.avgScore.toLocaleString()}</div>
                </div>
                <div className="bg-dark-800 rounded-lg p-2 md:p-3 border border-dark-700">
                  <div className="text-[10px] md:text-xs text-gray-400">Max Score</div>
                  <div className="text-base md:text-xl font-bold text-neon-blue">{selectedSubmission.maxScore.toLocaleString()}</div>
                </div>
                <div className="bg-dark-800 rounded-lg p-2 md:p-3 border border-dark-700">
                  <div className="text-[10px] md:text-xs text-gray-400">Submitted</div>
                  <div className="text-base md:text-xl font-bold text-neon-pink">{new Date(selectedSubmission.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="bg-dark-800 rounded-lg p-2 md:p-3 border border-dark-700">
                  <div className="text-[10px] md:text-xs text-gray-400">Lines</div>
                  <div className="text-base md:text-xl font-bold text-white">{selectedSubmission.linesOfCode}</div>
                </div>
              </div>
            )}
          </div>
      </main>
    </div>
  );
}
