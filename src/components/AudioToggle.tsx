/**
 * Audio Toggle Buttons
 * Separate controls for SFX (sound effects) and Music
 */

import { useAudio } from '../contexts/AudioContext';

export default function AudioToggle() {
  const { sfxEnabled, toggleSfx, musicEnabled, isPlaying, toggleMusic, startLoop, stopLoop } =
    useAudio();

  const handleMusicClick = () => {
    if (musicEnabled) {
      // Disabling music - stop then toggle
      stopLoop();
      toggleMusic();
    } else {
      // Enabling music - toggle then start
      toggleMusic();
      // Small delay to let state update
      setTimeout(() => startLoop(), 10);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* SFX Toggle */}
      <button
        onClick={toggleSfx}
        className={`p-2 rounded-lg border transition-colors ${
          sfxEnabled
            ? 'bg-dark-800 border-neon-green/50 text-neon-green'
            : 'bg-dark-800 border-dark-600 text-gray-500 hover:text-gray-400'
        }`}
        title={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
      >
        {/* Bell/SFX icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {sfxEnabled ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          ) : (
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
            </>
          )}
        </svg>
      </button>

      {/* Music Toggle */}
      <button
        onClick={handleMusicClick}
        className={`p-2 rounded-lg border transition-colors ${
          musicEnabled
            ? 'bg-dark-800 border-neon-pink/50 text-neon-pink'
            : 'bg-dark-800 border-dark-600 text-gray-500 hover:text-gray-400'
        }`}
        title={musicEnabled ? 'Mute music' : 'Enable music'}
      >
        {/* Music note icon */}
        <svg
          className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {musicEnabled ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          ) : (
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
