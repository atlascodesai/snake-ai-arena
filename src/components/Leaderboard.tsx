/**
 * Leaderboard Component
 * Shows ranked list of algorithm submissions
 */

import { Submission } from '../game/types';
import { AnimatedSnake } from './AnimatedSnake';

interface LeaderboardProps {
  submissions: Submission[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onFork: (id: number) => void;
  isLoading?: boolean;
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return `#${rank}`;
  }
}

function getRankColor(rank: number): string {
  switch (rank) {
    case 1: return 'text-yellow-400';
    case 2: return 'text-gray-300';
    case 3: return 'text-amber-600';
    default: return 'text-gray-500';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Leaderboard({
  submissions,
  selectedId,
  onSelect,
  onFork,
  isLoading = false,
}: LeaderboardProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading leaderboard...</div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="mb-2 flex justify-center">
            <AnimatedSnake size={48} />
          </div>
          <div>No submissions yet</div>
          <div className="text-sm">Be the first!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span>🏆</span>
        <span>Leaderboard</span>
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {submissions.map((submission, index) => {
          const rank = index + 1;
          const isSelected = submission.id === selectedId;

          return (
            <div
              key={submission.id}
              onClick={() => onSelect(submission.id)}
              className={`
                relative p-3 rounded-lg cursor-pointer transition-all
                ${isSelected
                  ? 'bg-neon-green/20 border-2 border-neon-green shadow-lg shadow-neon-green/20'
                  : 'bg-dark-700 border-2 border-transparent hover:border-dark-600 hover:bg-dark-600'
                }
              `}
            >
              {/* Rank badge */}
              <div className={`absolute -left-1 -top-1 ${getRankColor(rank)} font-bold text-sm`}>
                {getRankEmoji(rank)}
              </div>

              {/* Main content */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate pr-2">
                    {submission.name}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{submission.linesOfCode} lines</span>
                    <span className="text-gray-500">{formatDate(submission.createdAt)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-neon-green font-bold text-lg">
                    {submission.avgScore.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">avg pts</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(submission.id);
                  }}
                  className={`
                    flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors
                    ${isSelected
                      ? 'bg-neon-green text-dark-900'
                      : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                    }
                  `}
                >
                  ▶ {isSelected ? 'Playing' : 'Play'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFork(submission.id);
                  }}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-dark-600 text-gray-300 hover:bg-dark-500 transition-colors"
                >
                  📋 Fork
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
