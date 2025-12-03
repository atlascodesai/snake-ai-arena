/**
 * Audio Toggle Button
 */

import { useAudio } from '../contexts/AudioContext';

export default function AudioToggle() {
  const { isMuted, isPlaying, toggleMute, startLoop, stopLoop } = useAudio();

  const handleClick = () => {
    if (isMuted) {
      // Unmuting - set state then start
      toggleMute();
      startLoop();
    } else {
      // Muting - stop then set state
      stopLoop();
      toggleMute();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg bg-dark-800 border border-dark-600 hover:border-dark-500 transition-colors group relative"
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? (
        // Muted icon
        <svg
          className="w-5 h-5 text-gray-500 group-hover:text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        // Playing icon with animation
        <svg
          className={`w-5 h-5 ${isPlaying ? 'text-neon-green' : 'text-gray-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}

    </button>
  );
}
