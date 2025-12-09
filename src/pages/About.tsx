/**
 * About Page
 * Information about the Snake AI Arena demo
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-full bg-dark-900 text-white pb-8">
      {/* Header */}
      <header className="border-b border-dark-700 px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                aria-label="Menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <nav
                    className="absolute left-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1"
                    role="menu"
                    aria-label="Main navigation"
                  >
                    <button
                      onClick={() => { navigate('/'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <span aria-hidden="true">🏠</span><span>Arena Home</span>
                    </button>
                    <button
                      onClick={() => { navigate('/editor'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <span aria-hidden="true">✏️</span><span>Editor</span>
                    </button>
                    <button
                      onClick={() => { navigate('/play'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <span aria-hidden="true">🎮</span><span>Manual Play</span>
                    </button>
                    <button
                      onClick={() => { navigate('/leaderboard'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-dark-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <span aria-hidden="true">🏆</span><span>Leaderboard</span>
                    </button>
                    <hr className="my-1 border-dark-700" aria-hidden="true" />
                    <button
                      onClick={() => { navigate('/about'); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-neon-green hover:bg-dark-700 flex items-center gap-2"
                      role="menuitem"
                    >
                      <span aria-hidden="true">ℹ️</span><span>About</span>
                    </button>
                  </nav>
                </>
              )}
            </div>

            <span className="text-lg md:text-xl">ℹ️</span>
            <h1 className="text-sm md:text-base font-bold text-white">About</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl">🐍</span>
          <div>
            <h1 className="text-3xl font-bold">Snake AI Arena</h1>
            <p className="text-gray-400">An AI Coding Demo</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* What is this */}
          <section className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <h2 className="text-xl font-bold text-neon-green mb-4">What is this?</h2>
            <p className="text-gray-300 leading-relaxed">
              Snake AI Arena is a demo showcasing AI-assisted code development. Write JavaScript
              algorithms to control a snake in a 3D grid, benchmark your code against others,
              and compete on the leaderboard. The entire platform was built as a demonstration
              of modern AI coding capabilities.
            </p>
          </section>

          {/* The Challenge */}
          <section className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <h2 className="text-xl font-bold text-neon-blue mb-4">The Challenge</h2>
            <div className="space-y-4 text-gray-300">
              <p>Write an algorithm that controls a snake in a 16×16×16 3D grid:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><span className="text-white font-medium">Grid:</span> 4,096 cells with wrapping boundaries</li>
                <li><span className="text-white font-medium">Goal:</span> Eat food to grow and score points</li>
                <li><span className="text-white font-medium">Avoid:</span> Colliding with your own body</li>
                <li><span className="text-white font-medium">Limit:</span> 25,000 frames per game (timeout)</li>
                <li><span className="text-white font-medium">Benchmark:</span> 10 games, best average score wins</li>
              </ul>
            </div>
          </section>

          {/* How to Play */}
          <section className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <h2 className="text-xl font-bold text-neon-pink mb-4">How to Play</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-300 ml-4">
              <li>Click <span className="text-neon-green font-medium">"+ New Algorithm"</span> to open the editor</li>
              <li>Write your snake AI using the provided template and utilities</li>
              <li>Use <span className="text-white font-medium">"Test Run"</span> to see your algorithm in action</li>
              <li>Run <span className="text-neon-blue font-medium">"Benchmark"</span> to test across 10 games</li>
              <li>Submit your algorithm to compete on the leaderboard!</li>
            </ol>
          </section>

          {/* Available Utilities */}
          <section className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <h2 className="text-xl font-bold text-white mb-4">Available Utilities</h2>
            <div className="font-mono text-sm space-y-2 text-gray-300">
              <div><span className="text-neon-green">utils.wrapPosition(pos)</span> - Handle grid wrapping</div>
              <div><span className="text-neon-green">utils.distance(a, b)</span> - Manhattan distance between positions</div>
              <div><span className="text-neon-green">utils.posEqual(a, b)</span> - Check if positions are equal</div>
              <div><span className="text-neon-green">utils.findPathBFS(from, to, obstacles)</span> - Pathfinding</div>
              <div><span className="text-neon-green">utils.createCollisionSet(positions)</span> - Fast collision detection</div>
              <div><span className="text-neon-green">utils.ALL_DIRECTIONS</span> - Array of 6 movement directions</div>
            </div>
          </section>

          {/* Credits */}
          <section className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <h2 className="text-xl font-bold text-gray-400 mb-4">Built With</h2>
            <div className="flex flex-wrap gap-3">
              {['React', 'TypeScript', 'Three.js', 'Tailwind CSS', 'Monaco Editor', 'Express', 'PostgreSQL'].map(tech => (
                <span key={tech} className="px-3 py-1 bg-dark-700 rounded-full text-sm text-gray-300">
                  {tech}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/editor')}
            className="px-6 py-3 bg-neon-green text-dark-900 font-bold rounded-lg hover:bg-neon-green/90 transition-colors"
          >
            Start Coding →
          </button>
        </div>
      </main>
    </div>
  );
}
