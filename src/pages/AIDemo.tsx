/**
 * AI Demo Page - Password Protected
 * This is a placeholder. Private content is loaded separately.
 */

import { useState } from 'react';

export default function AIDemo() {
  const [activeTab, setActiveTab] = useState<'overview' | 'demo' | 'docs'>('overview');

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
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to AI Demo</h2>
              <p className="text-gray-400 leading-relaxed">
                This is a protected demo environment for showcasing AI capabilities.
                Content on this page is private and requires authentication to access.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '⚡', title: 'Fast', desc: 'Real-time AI responses' },
                { icon: '🔒', title: 'Secure', desc: 'Password protected access' },
                { icon: '🎯', title: 'Focused', desc: 'Tailored demonstrations' },
              ].map((card) => (
                <div key={card.title} className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                  <span className="text-3xl">{card.icon}</span>
                  <h3 className="text-lg font-semibold text-white mt-3">{card.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'demo' && (
          <div className="bg-dark-800 rounded-xl p-8 border border-dark-700 text-center">
            <span className="text-6xl">🎮</span>
            <h2 className="text-2xl font-bold text-white mt-4">Demo Area</h2>
            <p className="text-gray-400 mt-2">Interactive demonstrations will appear here.</p>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="bg-dark-800 rounded-xl p-8 border border-dark-700">
            <h2 className="text-2xl font-bold text-white mb-4">Documentation</h2>
            <div className="prose prose-invert">
              <p className="text-gray-400">
                Technical documentation and API references for the demo features.
              </p>
              <ul className="text-gray-400 mt-4 space-y-2">
                <li>• Getting started guide</li>
                <li>• API reference</li>
                <li>• Integration examples</li>
                <li>• Best practices</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
