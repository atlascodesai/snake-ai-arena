/**
 * AI Demo Page - Password Protected
 * Content is loaded from private submodule when available.
 */

import { useState, useEffect } from 'react';

// Try to import private presentation component
let AIDemoPresentation: React.ComponentType | null = null;
try {
  AIDemoPresentation = require('../private/AIDemoContent').AIDemoPresentation;
} catch {
  AIDemoPresentation = null;
}

export default function AIDemo() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    fetch('/api/aidemo/check')
      .then(r => r.json())
      .then(data => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/aidemo/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        setAuthenticated(true);
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Password prompt
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="bg-dark-800 rounded-xl p-8 border border-dark-700 w-full max-w-sm">
          <div className="text-center mb-6">
            <span className="text-4xl">🔒</span>
            <h1 className="text-xl font-bold text-white mt-3">AI Demo</h1>
            <p className="text-gray-500 text-sm mt-1">Enter password to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-green text-center"
            />

            {error && (
              <p className="text-red-400 text-sm text-center mt-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full mt-4 px-4 py-3 bg-neon-green text-dark-900 font-semibold rounded-lg hover:bg-neon-green/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated - show presentation
  if (AIDemoPresentation) {
    return <AIDemoPresentation />;
  }

  // Fallback if presentation component not available
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="bg-dark-800 rounded-xl p-8 border border-dark-700 text-center max-w-md">
        <span className="text-6xl">🤖</span>
        <h1 className="text-2xl font-bold text-white mt-4">AI Demo</h1>
        <p className="text-gray-400 mt-2">
          Presentation content is not available. Please ensure the private submodule is installed.
        </p>
      </div>
    </div>
  );
}
