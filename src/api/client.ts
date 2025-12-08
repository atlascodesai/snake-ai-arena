/**
 * API Client for Snake AI Arena
 */

const API_URL = import.meta.env.VITE_API_URL || '';

export interface LeaderboardEntry {
  id: number;
  name: string;
  linesOfCode: number;
  avgScore: number;
  maxScore: number;
  survivalRate: number;
  gamesPlayed: number;
  createdAt: string;
  rank: number;
}

export interface SubmissionDetail extends LeaderboardEntry {
  code: string;
}

export interface SubmissionResult {
  id: number;
  name: string;
  linesOfCode: number;
  avgScore: number;
  maxScore: number;
  survivalRate: number;
  rank: number;
  totalSubmissions: number;
}

export interface PlacementPreview {
  projectedRank: number;
  totalSubmissions: number;
  above: { name: string; avgScore: number; rank: number }[];
  below: { name: string; avgScore: number; rank: number }[];
}

// Control type options
export type ControlType = 'wasd-zx' | 'wasd-qe' | 'arrows-ws';

// View mode options
export type ViewMode = 'orbit' | 'fpv';

export interface ManualScoreEntry {
  id: number;
  name: string;
  score: number;
  length: number;
  controlType: ControlType;
  viewMode: ViewMode;
  createdAt: string;
  rank: number;
}

export interface ManualScoreResult {
  id: number;
  name: string;
  score: number;
  length: number;
  controlType: ControlType;
  viewMode: ViewMode;
  rank: number;
  totalScores: number;
}

export const api = {
  // Get leaderboard
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await fetch(`${API_URL}/api/leaderboard`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },

  // Get single submission with code
  async getSubmission(id: number): Promise<SubmissionDetail> {
    const res = await fetch(`${API_URL}/api/leaderboard/${id}`);
    if (!res.ok) throw new Error('Failed to fetch submission');
    return res.json();
  },

  // Create new submission
  async createSubmission(data: {
    name: string;
    code: string;
    avgScore: number;
    maxScore: number;
    survivalRate: number;
    gamesPlayed: number;
  }): Promise<SubmissionResult> {
    const res = await fetch(`${API_URL}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create submission');
    return res.json();
  },

  // Preview placement without submitting
  async previewPlacement(avgScore: number): Promise<PlacementPreview> {
    const res = await fetch(`${API_URL}/api/leaderboard/preview/${avgScore}`);
    if (!res.ok) throw new Error('Failed to preview placement');
    return res.json();
  },

  // Manual play scores
  async getManualLeaderboard(): Promise<ManualScoreEntry[]> {
    const res = await fetch(`${API_URL}/api/manual`);
    if (!res.ok) throw new Error('Failed to fetch manual leaderboard');
    return res.json();
  },

  async submitManualScore(data: {
    name: string;
    score: number;
    length: number;
    controlType?: ControlType;
    viewMode?: ViewMode;
  }): Promise<ManualScoreResult> {
    const res = await fetch(`${API_URL}/api/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit score');
    return res.json();
  },
};
