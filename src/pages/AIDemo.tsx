/**
 * AI Demo Page - Password Protected
 * Content is loaded from private submodule when available.
 */

import { useState, useEffect } from 'react';

// Try to import private content, fallback to null if submodule not present
let PrivateContent: typeof import('../private/AIDemoContent').AIDemoContent | null = null;
try {
  // Dynamic import would be cleaner but static works for build-time check
  PrivateContent = require('../private/AIDemoContent').AIDemoContent;
} catch {
  PrivateContent = null;
}

// Fallback content when private submodule is not available
const fallbackContent = {
  overview: {
    title: "Private Demo",
    description: "This demo requires the private content module to be installed.",
    cards: [] as { icon: string; title: string; desc: string }[]
  },
  demo: {
    title: "Demo Unavailable",
    description: "Private content module not installed."
  },
  docs: {
    title: "Documentation",
    description: "Documentation requires the private content module.",
    items: [] as string[]
  }
};

const content = PrivateContent || fallbackContent;

export default function AIDemo() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'demo' | 'docs'>('overview');

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

  // Authenticated - show content
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h1 className="text-xl font-bold text-white">AI Demo</h1>
              <p className="text-xs text-gray-500">Private Preview</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(['overview', 'demo', 'docs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-neon-green text-dark-900'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-dark-800 rounded-xl p-8 border border-dark-700">
              <h2 className="text-2xl font-bold text-white mb-4">{content.overview.title}</h2>
              <p className="text-gray-400 leading-relaxed">
                {content.overview.description}
              </p>
            </div>

            {content.overview.cards.length > 0 && (
              <div className="grid md:grid-cols-3 gap-6">
                {content.overview.cards.map((card) => (
                  <div key={card.title} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                    <span className="text-3xl">{card.icon}</span>
                    <h3 className="text-lg font-semibold text-white mt-3">{card.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{card.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'demo' && (
          <div className="bg-dark-800 rounded-xl p-8 border border-dark-700 text-center">
            <span className="text-6xl">🎮</span>
            <h2 className="text-2xl font-bold text-white mt-4">{content.demo.title}</h2>
            <p className="text-gray-400 mt-2">{content.demo.description}</p>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="bg-dark-800 rounded-xl p-8 border border-dark-700">
            <h2 className="text-2xl font-bold text-white mb-4">{content.docs.title}</h2>
            <div className="prose prose-invert">
              <p className="text-gray-400">
                {content.docs.description}
              </p>
              {content.docs.items.length > 0 && (
                <ul className="text-gray-400 mt-4 space-y-2">
                  {content.docs.items.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
