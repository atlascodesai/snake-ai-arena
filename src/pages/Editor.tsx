/**
 * Editor Page
 * Monaco code editor with live game preview
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import GameViewer from '../components/GameViewer';
import SubmissionModal from '../components/SubmissionModal';
import AudioToggle from '../components/AudioToggle';
import { useAudio } from '../contexts/AudioContext';
import { api, PlacementPreview } from '../api/client';
import { GameState } from '../game/types';
import { templateCode, demoAlgorithm } from '../game/algorithms';
import { compileAlgorithm } from '../game/AlgorithmRunner';
import { HeadlessGame } from '../game/HeadlessGame';
import { MAX_FRAMES } from '../game/utils';

interface BenchmarkResult {
  avgScore: number;
  maxScore: number;
  minScore: number;
  scores: number[];
}

export default function Editor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { startLoop, stopLoop, playWhammy, playWin } = useAudio();
  const prevScoreRef = useRef(0);

  const [code, setCode] = useState(templateCode);
  const [algorithmName, setAlgorithmName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [currentGameNum, setCurrentGameNum] = useState(0);
  const [liveScores, setLiveScores] = useState<number[]>([]);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [previousResult, setPreviousResult] = useState<BenchmarkResult | null>(null);
  const [placementPreview, setPlacementPreview] = useState<PlacementPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    name: string;
    rank: number;
    totalSubmissions: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: -2, y: 0, z: 0 }],
    food: { x: 5, y: 0, z: 0 },
    score: 0,
    frame: 0,
    gameOver: false,
    deathReason: null,
  });

  const gameRef = useRef<HeadlessGame | null>(null);
  const demoIntervalRef = useRef<number | null>(null);
  const testIntervalRef = useRef<number | null>(null);
  const modeRef = useRef<'demo' | 'test' | 'benchmark' | 'paused'>('demo');

  // Speed multiplier for test runs
  const SPEED_OPTIONS = [1, 2, 5, 10, 15, 20] as const;
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const speedRef = useRef<number>(1);
  const BASE_INTERVAL = 100; // ms per tick at 1x speed

  // Feature flag: allow benchmark to interrupt running tests
  const [allowBenchmarkInterrupt, setAllowBenchmarkInterrupt] = useState(true);

  // Stop audio when component unmounts (navigation away)
  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, [stopLoop]);

  // Load forked algorithm
  useEffect(() => {
    if (id) {
      api.getSubmission(parseInt(id))
        .then(submission => {
          setCode(submission.code);
          setAlgorithmName(`${submission.name} (fork)`);
        })
        .catch(err => {
          console.error('Failed to load submission:', err);
        });
    }
  }, [id]);

  // Start demo animation
  useEffect(() => {
    if (!isRunning && !isBenchmarking && !isPaused) {
      // Only start demo if we're actually in demo mode (not transitioning)
      if (modeRef.current !== 'demo') return;

      // Play demo animation
      gameRef.current = new HeadlessGame(demoAlgorithm, Date.now());
      setGameState(gameRef.current.getState());

      demoIntervalRef.current = window.setInterval(() => {
        // Double-check we're still in demo mode
        if (modeRef.current !== 'demo' || !gameRef.current) return;

        const state = gameRef.current.tick();
        setGameState(state);

        if (state.gameOver) {
          gameRef.current = new HeadlessGame(demoAlgorithm, Date.now());
        }
      }, 150);

      return () => {
        if (demoIntervalRef.current) {
          clearInterval(demoIntervalRef.current);
          demoIntervalRef.current = null;
        }
      };
    }
  }, [isRunning, isBenchmarking, isPaused]);

  // Stop game completely (reset to demo mode)
  const stopGame = useCallback(() => {
    modeRef.current = 'demo';
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  // Pause the current game (keep state)
  const pauseGame = useCallback(() => {
    modeRef.current = 'paused';
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    stopLoop();
    setIsRunning(false);
    setIsPaused(true);
  }, [stopLoop]);

  // Resume the paused game
  const resumeGame = useCallback(() => {
    if (!gameRef.current || gameState.gameOver) return;

    modeRef.current = 'test';
    setIsRunning(true);
    setIsPaused(false);
    const speed = speedRef.current;
    startLoop(Math.max(50, BASE_INTERVAL / speed));

    testIntervalRef.current = window.setInterval(() => {
      if (!gameRef.current) return;

      // Run multiple ticks per interval for higher speeds
      const ticksPerFrame = speedRef.current;
      for (let i = 0; i < ticksPerFrame; i++) {
        if (!gameRef.current || gameRef.current.isOver()) break;

        const state = gameRef.current.tick();

        // Check if food was eaten
        if (state.score > prevScoreRef.current) {
          playWin();
          prevScoreRef.current = state.score;
        }

        if (state.gameOver) {
          setGameState(state);
          stopLoop();
          playWhammy();
          pauseGame();
          return;
        }
      }

      setGameState(gameRef.current.getState());
    }, BASE_INTERVAL);
  }, [gameState.gameOver, pauseGame, startLoop, stopLoop, playWhammy, playWin]);

  // Reset to default state (ready for new test or benchmark)
  const resetGame = useCallback(() => {
    modeRef.current = 'demo';
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
    gameRef.current = null;
  }, []);

  // Handle speed change
  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeedMultiplier(newSpeed);
    speedRef.current = newSpeed;
  }, []);

  // Run test (single game with visualization)
  const handleRunTest = useCallback(() => {
    setError(null);
    setBenchmarkResult(null);
    setPlacementPreview(null);

    try {
      const algorithm = compileAlgorithm(code);

      // Set mode FIRST (synchronous) to prevent demo from interfering
      modeRef.current = 'test';

      // Clear any existing intervals
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
        testIntervalRef.current = null;
      }
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }

      // Set running state
      setIsRunning(true);
      setIsPaused(false);

      gameRef.current = new HeadlessGame(algorithm, Date.now());
      setGameState(gameRef.current.getState());
      prevScoreRef.current = 0;
      const speed = speedRef.current;
      startLoop(Math.max(50, BASE_INTERVAL / speed));

      testIntervalRef.current = window.setInterval(() => {
        if (!gameRef.current) return;

        // Run multiple ticks per interval for higher speeds
        const ticksPerFrame = speedRef.current;
        for (let i = 0; i < ticksPerFrame; i++) {
          if (!gameRef.current || gameRef.current.isOver()) break;

          const state = gameRef.current.tick();

          // Check if food was eaten
          if (state.score > prevScoreRef.current) {
            playWin();
            prevScoreRef.current = state.score;
          }

          if (state.gameOver) {
            setGameState(state);
            stopLoop();
            playWhammy();
            pauseGame();
            return;
          }
        }

        setGameState(gameRef.current.getState());
      }, BASE_INTERVAL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [code, pauseGame, startLoop, stopLoop, playWhammy, playWin]);

  // Run full benchmark (10 games in 30 seconds) with VISUAL playback
  const handleBenchmark = useCallback(async () => {
    setError(null);
    // Save previous result before clearing
    if (benchmarkResult) {
      setPreviousResult(benchmarkResult);
    }
    setBenchmarkResult(null);
    setPlacementPreview(null);
    setLiveScores([]);
    setCurrentGameNum(0);

    // Set mode FIRST (synchronous) before any state changes
    modeRef.current = 'benchmark';
    stopGame();

    try {
      const algorithm = compileAlgorithm(code);
      setIsBenchmarking(true);

      const scores: number[] = [];
      const NUM_GAMES = 10;
      const TARGET_TIME_MS = 30000; // 30 seconds total for all games
      const TIME_PER_GAME = TARGET_TIME_MS / NUM_GAMES; // 3 seconds per game
      const MAX_FRAMES_PER_GAME = MAX_FRAMES; // Use global constant

      // Run each game with visualization
      for (let gameNum = 0; gameNum < NUM_GAMES; gameNum++) {
        setCurrentGameNum(gameNum + 1);

        // Create new game with deterministic seed
        const game = new HeadlessGame(algorithm, gameNum + 1);
        setGameState(game.getState());
        prevScoreRef.current = 0;
        startLoop(80); // Faster tempo for benchmark

        const gameStartTime = Date.now();

        // Run this game with visual updates - dynamically adjust speed
        await new Promise<void>((resolve) => {
          let frameCount = 0;
          let lastVisualUpdate = 0;
          const VISUAL_INTERVAL = 33; // ~30fps visual updates

          const runFrame = () => {
            const now = Date.now();
            const elapsed = now - gameStartTime;
            const timeRemaining = TIME_PER_GAME - elapsed;

            // Run as many frames as needed to keep up with time budget
            const targetFrames = Math.min(
              MAX_FRAMES_PER_GAME,
              Math.floor((elapsed / TIME_PER_GAME) * MAX_FRAMES_PER_GAME * 1.5)
            );

            // Run frames in batch
            while (frameCount < targetFrames && !game.isOver()) {
              game.tick();
              frameCount++;

              // Check for food eaten
              const currentState = game.getState();
              if (currentState.score > prevScoreRef.current) {
                playWin();
                prevScoreRef.current = currentState.score;
              }
            }

            const state = game.getState();

            // Update visual at ~30fps
            if (now - lastVisualUpdate >= VISUAL_INTERVAL) {
              setGameState(state);
              lastVisualUpdate = now;
            }

            if (state.gameOver || frameCount >= MAX_FRAMES_PER_GAME || timeRemaining <= 0) {
              // Game finished
              stopLoop();
              playWhammy();
              setGameState(state); // Final update
              scores.push(state.score);
              setLiveScores([...scores]);

              // Brief pause between games for whammy sound
              setTimeout(resolve, 400);
            } else {
              // Continue running - use requestAnimationFrame for smooth updates
              requestAnimationFrame(runFrame);
            }
          };

          runFrame();
        });
      }

      // Calculate final results
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      const result = {
        scores,
        avgScore,
        maxScore,
        minScore,
      };

      setBenchmarkResult(result);

      // Fetch placement preview
      try {
        const preview = await api.previewPlacement(avgScore);
        setPlacementPreview(preview);
      } catch (err) {
        console.error('Failed to fetch placement preview:', err);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsBenchmarking(false);
      setCurrentGameNum(0);
      stopLoop();
    }
  }, [code, stopGame, benchmarkResult, startLoop, stopLoop, playWhammy, playWin]);

  // Submit to leaderboard
  const handleSubmit = useCallback(async () => {
    if (!algorithmName.trim()) {
      setError('Please enter a name for your algorithm');
      return;
    }

    if (!benchmarkResult) {
      setError('Please run a benchmark first');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await api.createSubmission({
        name: algorithmName.trim(),
        code,
        avgScore: benchmarkResult.avgScore,
        maxScore: benchmarkResult.maxScore,
        survivalRate: 100, // All games complete (we don't track survival anymore)
        gamesPlayed: 10,
      });

      setSubmissionResult({
        name: algorithmName.trim(),
        rank: result.rank,
        totalSubmissions: result.totalSubmissions,
        avgScore: result.avgScore,
        maxScore: result.maxScore,
        minScore: benchmarkResult.minScore,
      });
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  }, [algorithmName, benchmarkResult, code]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setShowModal(false);
    navigate('/');
  }, [navigate]);

  // Calculate live average
  const liveAvg = liveScores.length > 0
    ? Math.round(liveScores.reduce((a, b) => a + b, 0) / liveScores.length)
    : 0;

  // Calculate improvement from previous run
  const improvement = benchmarkResult && previousResult
    ? benchmarkResult.avgScore - previousResult.avgScore
    : null;

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'code' | 'game'>('code');

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">
      {/* Header - compact */}
      <header className="flex-shrink-0 border-b border-dark-700 px-2 py-1.5 md:px-4 md:py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm"
            >
              ←<span className="hidden sm:inline"> Back</span>
            </button>
            <div className="h-4 md:h-5 w-px bg-dark-600" />
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-base md:text-lg">🐍</span>
              <h1 className="text-xs md:text-sm font-bold text-white">Editor</h1>
            </div>
          </div>

          {/* Submit section */}
          <div className="flex items-center gap-1.5 md:gap-3">
            <AudioToggle />
            <input
              type="text"
              placeholder="Name..."
              value={algorithmName}
              onChange={(e) => setAlgorithmName(e.target.value)}
              className="px-1.5 py-1 md:px-2 md:py-1.5 bg-dark-700 border border-dark-600 rounded text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-green w-20 md:w-40"
            />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !benchmarkResult}
              className="px-2 py-1 md:px-3 md:py-1.5 bg-neon-green text-dark-900 text-xs md:text-sm font-semibold rounded hover:bg-neon-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isSubmitting ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <span>💾</span>
                  <span className="hidden sm:inline">Submit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile tab switcher */}
      <div className="md:hidden flex-shrink-0 flex border-b border-dark-700">
        <button
          onClick={() => setMobileTab('code')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mobileTab === 'code'
              ? 'text-neon-green border-b-2 border-neon-green'
              : 'text-gray-400'
          }`}
        >
          📝 Code
        </button>
        <button
          onClick={() => setMobileTab('game')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mobileTab === 'game'
              ? 'text-neon-green border-b-2 border-neon-green'
              : 'text-gray-400'
          }`}
        >
          🎮 Game
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Code editor - 50% on desktop, full/hidden on mobile */}
        <div className={`${mobileTab === 'code' ? 'flex' : 'hidden'} md:flex w-full md:w-1/2 flex-col border-r border-dark-700 min-h-0`}>
          <div className="flex-1 min-h-0">
            <CodeEditor
              value={code}
              onChange={setCode}
              isRunning={isRunning}
              liveContext={{
                snake: gameState.snake,
                food: gameState.food,
                score: gameState.score,
                frame: gameState.frame,
                gridSize: 16,
              }}
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="px-2 py-2 md:px-4 md:py-3 bg-red-900/30 border-t border-red-800 text-red-400 text-xs md:text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Game preview panel - 50% on desktop, full/hidden on mobile */}
        <div className={`${mobileTab === 'game' ? 'flex' : 'hidden'} md:flex w-full md:w-1/2 flex-col bg-dark-800 min-h-0 overflow-y-auto`}>
          {/* Live Stats Bar - compact */}
          <div className="flex-shrink-0 px-3 py-1.5 border-b border-dark-700 bg-dark-900/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Speed multiplier - only show when not benchmarking */}
                {!isBenchmarking && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 hidden md:inline">SPEED</span>
                    <div className="flex items-center bg-dark-700 rounded overflow-hidden">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold transition-colors ${
                            speedMultiplier === speed
                              ? 'bg-neon-pink text-dark-900'
                              : 'text-gray-400 hover:text-white hover:bg-dark-600'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Game number - only during benchmark */}
                {isBenchmarking && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">GAME</span>
                    <span className="font-mono font-bold text-neon-blue">
                      {currentGameNum}/10
                    </span>
                  </div>
                )}

                {/* Current Score */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">SCORE</span>
                  <span className="font-mono font-bold text-neon-green">
                    {gameState.score.toLocaleString()}
                  </span>
                </div>

                {/* Length */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">LEN</span>
                  <span className="font-mono font-bold text-white">
                    {gameState.snake.length}
                  </span>
                </div>

                {/* Frame - hide on mobile */}
                <div className="hidden md:flex items-center gap-1">
                  <span className="text-gray-500">FRAME</span>
                  <span className="font-mono text-gray-400">
                    {gameState.frame.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Live Average during benchmark */}
              {isBenchmarking && liveScores.length > 0 && (
                <div className="flex items-center gap-1 bg-neon-green/10 px-2 py-0.5 rounded-full">
                  <span className="text-neon-green">AVG</span>
                  <span className="font-mono font-bold text-neon-green">
                    {liveAvg.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Game viewer */}
          <div className="flex-1 min-h-0 relative">
            <GameViewer gameState={gameState} className="w-full h-full" />

            {/* Game Over overlay */}
            {gameState.gameOver && !isBenchmarking && (
              <div className="absolute inset-0 flex items-center justify-center bg-dark-900/70">
                <div className="text-center">
                  <div className="text-3xl mb-2">💀</div>
                  <div className="text-white font-bold">Game Over</div>
                  <div className="text-gray-400 text-sm">{gameState.deathReason}</div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel - Controls & Scoreboard - Always visible */}
          <div className="flex-shrink-0 border-t border-dark-700 bg-dark-800">
            {/* Action buttons - compact */}
            <div className="p-2 flex gap-2">
              {/* Test Run button - changes based on state */}
              {isRunning ? (
                // Running - show Stop button
                <button
                  onClick={pauseGame}
                  disabled={isBenchmarking}
                  className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  ⏹ STOP!
                </button>
              ) : isPaused ? (
                // Paused - show Reset and Resume buttons
                <div className="flex-1 flex gap-1">
                  <button
                    onClick={resetGame}
                    className="flex-1 px-3 py-1.5 bg-dark-600 text-white text-sm font-medium rounded hover:bg-dark-500 transition-colors flex items-center justify-center gap-1.5"
                  >
                    ↺ Reset
                  </button>
                  {!gameState.gameOver && (
                    <button
                      onClick={resumeGame}
                      className="flex-1 px-3 py-1.5 bg-neon-green text-dark-900 text-sm font-medium rounded hover:bg-neon-green/90 transition-colors flex items-center justify-center gap-1.5"
                    >
                      ▶ Resume
                    </button>
                  )}
                </div>
              ) : (
                // Default - show Test Run button
                <button
                  onClick={handleRunTest}
                  disabled={isBenchmarking}
                  className="flex-1 px-3 py-1.5 bg-dark-600 text-white text-sm font-medium rounded hover:bg-dark-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  ▶ Test Run
                </button>
              )}
              <button
                onClick={handleBenchmark}
                disabled={isBenchmarking || (!allowBenchmarkInterrupt && (isRunning || isPaused))}
                className="flex-1 px-3 py-1.5 bg-neon-blue text-dark-900 text-sm font-medium rounded hover:bg-neon-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isBenchmarking ? (
                  <>
                    <span className="animate-pulse">⏱</span>
                    <span>Running... {Math.round((currentGameNum / 10) * 100)}%</span>
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    <span>Benchmark (30s)</span>
                  </>
                )}
              </button>
            </div>

            {/* Dev options toggle */}
            <div className="px-2 pb-1">
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer hover:text-gray-400">
                <input
                  type="checkbox"
                  checked={allowBenchmarkInterrupt}
                  onChange={(e) => setAllowBenchmarkInterrupt(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-600 bg-dark-700 text-neon-blue focus:ring-0 focus:ring-offset-0"
                />
                <span>Allow benchmark to interrupt test</span>
              </label>
            </div>

            {/* Scoreboard - compact, always visible */}
            <div className="px-2 pb-2">
              <div className="bg-dark-700 rounded p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Scoreboard</span>
                  {(isBenchmarking || benchmarkResult) && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-gray-500">
                        Avg: <span className="text-neon-green font-bold">
                          {benchmarkResult ? benchmarkResult.avgScore.toLocaleString() : liveAvg.toLocaleString()}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Max: <span className="text-neon-blue font-bold">
                          {benchmarkResult ? benchmarkResult.maxScore.toLocaleString() : (liveScores.length > 0 ? Math.max(...liveScores).toLocaleString() : '-')}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Score grid - compact */}
                <div className="grid grid-cols-10 gap-0.5">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const score = liveScores[i] ?? (benchmarkResult?.scores[i]);
                    const prevScore = previousResult?.scores[i];
                    const isActive = isBenchmarking && i === currentGameNum - 1;
                    const isCompleted = score !== undefined;
                    const diff = isCompleted && prevScore !== undefined ? score - prevScore : null;

                    return (
                      <div
                        key={i}
                        className={`
                          relative py-1 px-0.5 rounded text-center text-[10px] font-mono transition-all
                          ${isActive ? 'bg-neon-blue/30 border border-neon-blue animate-pulse' : ''}
                          ${isCompleted && !isActive ? 'bg-dark-600' : ''}
                          ${!isCompleted && !isActive ? 'bg-dark-800 border border-dark-600' : ''}
                        `}
                      >
                        <div className="text-[8px] text-gray-500">#{i + 1}</div>
                        <div className={`font-bold ${isCompleted ? 'text-neon-green' : 'text-gray-600'}`}>
                          {isCompleted ? score?.toLocaleString() : '-'}
                        </div>
                        {/* Show diff from previous run */}
                        {diff !== null && !isBenchmarking && (
                          <div className={`text-[8px] ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff >= 0 ? '+' : ''}{diff}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Final results with placement preview - compact */}
                {benchmarkResult && !isBenchmarking && (
                  <div className="mt-2 pt-2 border-t border-dark-600">
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-1 text-center mb-2">
                      <div>
                        <div className="text-[9px] text-gray-500 uppercase">Average</div>
                        <div className="text-sm font-bold text-neon-green">
                          {benchmarkResult.avgScore.toLocaleString()}
                        </div>
                        {improvement !== null && (
                          <div className={`text-[10px] ${improvement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {improvement >= 0 ? '▲' : '▼'} {Math.abs(improvement).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-500 uppercase">Best</div>
                        <div className="text-sm font-bold text-neon-blue">
                          {benchmarkResult.maxScore.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-500 uppercase">Worst</div>
                        <div className="text-sm font-bold text-neon-pink">
                          {benchmarkResult.minScore.toLocaleString()}
                        </div>
                      </div>
                      {/* Placement preview */}
                      <div>
                        <div className="text-[9px] text-gray-500 uppercase">Rank</div>
                        {placementPreview ? (
                          <div className="text-sm font-bold text-yellow-400">
                            #{placementPreview.projectedRank}
                            <span className="text-[10px] text-gray-500 font-normal">
                              /{placementPreview.totalSubmissions}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-gray-500">-</div>
                        )}
                      </div>
                    </div>

                    {/* Leaderboard context - compact */}
                    {placementPreview && (placementPreview.above.length > 0 || placementPreview.below.length > 0) && (
                      <div className="bg-dark-800 rounded p-1.5 text-[10px]">
                        <div className="text-gray-500 text-[9px] uppercase mb-0.5">Leaderboard Preview</div>
                        <div className="space-y-0">
                          {/* Entries above */}
                          {placementPreview.above.map((entry, i) => (
                            <div key={`above-${i}`} className="flex justify-between text-gray-400">
                              <span>#{entry.rank} {entry.name}</span>
                              <span>{entry.avgScore.toLocaleString()}</span>
                            </div>
                          ))}
                          {/* Your entry */}
                          <div className="flex justify-between text-neon-green font-bold bg-neon-green/10 px-1 rounded">
                            <span>#{placementPreview.projectedRank} Your Algorithm</span>
                            <span>{benchmarkResult.avgScore.toLocaleString()}</span>
                          </div>
                          {/* Entries below */}
                          {placementPreview.below.map((entry, i) => (
                            <div key={`below-${i}`} className="flex justify-between text-gray-400">
                              <span>#{entry.rank} {entry.name}</span>
                              <span>{entry.avgScore.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Previous run comparison */}
                    {previousResult && (
                      <div className="mt-1 text-[10px] text-gray-500 text-center">
                        Previous: <span className="text-gray-400">{previousResult.avgScore.toLocaleString()} avg</span>
                        {improvement !== null && (
                          <span className={`ml-1 ${improvement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ({improvement >= 0 ? '+' : ''}{improvement.toLocaleString()})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Help text */}
              {!benchmarkResult && !isBenchmarking && (
                <div className="mt-1 text-[10px] text-gray-500 text-center">
                  💡 Run benchmark to test your algorithm across 10 games
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Submission modal */}
      <SubmissionModal
        isOpen={showModal}
        onClose={handleModalClose}
        result={submissionResult}
      />
    </div>
  );
}
