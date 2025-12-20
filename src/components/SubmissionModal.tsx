/**
 * Submission Success Modal with Confetti
 */

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    name: string;
    rank: number;
    totalSubmissions: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
  } | null;
}

function getRankMessage(rank: number, total: number): { emoji: string; message: string } {
  const percentile = ((total - rank + 1) / total) * 100;

  if (rank === 1) {
    return { emoji: '🏆', message: "You're #1! The champion!" };
  } else if (rank <= 3) {
    return { emoji: '🥇', message: 'Top 3! Amazing work!' };
  } else if (percentile >= 90) {
    return { emoji: '🔥', message: "Top 10%! You're on fire!" };
  } else if (percentile >= 75) {
    return { emoji: '⭐', message: 'Top 25%! Great algorithm!' };
  } else if (percentile >= 50) {
    return { emoji: '💪', message: 'Top 50%! Keep improving!' };
  } else {
    return { emoji: '🚀', message: "You're on the board! Keep coding!" };
  }
}

export default function SubmissionModal({ isOpen, onClose, result }: SubmissionModalProps) {
  // Fire confetti when modal opens
  useEffect(() => {
    if (isOpen && result) {
      // Different confetti based on rank
      if (result.rank === 1) {
        // Gold confetti explosion
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FFA500', '#FF6347'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#FFA500', '#FF6347'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      } else if (result.rank <= 3) {
        // Silver/bronze burst
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#C0C0C0', '#CD7F32', '#00ff88'],
        });
      } else {
        // Standard celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff88', '#00ffff', '#ff0088'],
        });
      }
    }
  }, [isOpen, result]);

  if (!isOpen || !result) return null;

  const { emoji, message } = getRankMessage(result.rank, result.totalSubmissions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-dark-800 border border-dark-600 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Emoji */}
          <div className="text-6xl mb-4">{emoji}</div>

          {/* Congratulations */}
          <h2 className="text-2xl font-bold text-white mb-2">Congratulations!</h2>

          <p className="text-gray-400 mb-6">{message}</p>

          {/* Rank display */}
          <div className="bg-dark-700 rounded-xl p-6 mb-6">
            <div className="text-sm text-gray-400 mb-1">Your Rank</div>
            <div className="text-5xl font-bold text-neon-green mb-2">#{result.rank}</div>
            <div className="text-sm text-gray-500">
              out of {result.totalSubmissions} submissions
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-xs text-gray-400">Avg Score</div>
              <div className="text-lg font-bold text-neon-green">
                {result.avgScore.toLocaleString()}
              </div>
            </div>
            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-xs text-gray-400">Max Score</div>
              <div className="text-lg font-bold text-neon-blue">
                {result.maxScore.toLocaleString()}
              </div>
            </div>
            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-xs text-gray-400">Min Score</div>
              <div className="text-lg font-bold text-neon-pink">
                {result.minScore.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Algorithm name */}
          <div className="text-sm text-gray-400">
            Algorithm: <span className="text-white font-medium">{result.name}</span>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-neon-green text-dark-900 font-semibold rounded-lg hover:bg-neon-green/90 transition-colors"
        >
          View Leaderboard
        </button>
      </div>
    </div>
  );
}
