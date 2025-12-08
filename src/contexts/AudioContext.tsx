/**
 * Global Audio Context
 * Separate controls for sound effects (SFX) and music
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

// Audio context singleton
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// PYL-style bouncing frequency pattern (for music loop)
const FREQ_PATTERN = [1, 1.25, 1.5, 1.25, 1, 0.8, 1, 1.33, 1.5, 1.33, 1, 0.9, 1.1, 1.4, 1.2, 1, 0.85, 1.15];
const BASE_FREQ = 400;
const VOLUME = 0.15;

interface AudioContextType {
  // SFX controls (on by default)
  sfxEnabled: boolean;
  toggleSfx: () => void;
  playWhammy: () => void;
  playWin: () => void;

  // Music controls (off by default)
  musicEnabled: boolean;
  isPlaying: boolean;
  toggleMusic: () => void;
  startLoop: (interval?: number) => void;
  stopLoop: () => void;
  setSpeed: (interval: number) => void;

  // Legacy compatibility
  isMuted: boolean;
  toggleMute: () => void;
  playTick: (index: number) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  // SFX: ON by default
  const [sfxEnabled, setSfxEnabled] = useState(true);
  // Music: OFF by default
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const sfxEnabledRef = useRef(sfxEnabled);
  const musicEnabledRef = useRef(musicEnabled);
  const speedRef = useRef(120);

  // Keep refs in sync
  useEffect(() => {
    sfxEnabledRef.current = sfxEnabled;
  }, [sfxEnabled]);

  useEffect(() => {
    musicEnabledRef.current = musicEnabled;
  }, [musicEnabled]);

  // Play a single tick/beep - PYL board bounce sound (music)
  const playTick = useCallback((index: number) => {
    if (!musicEnabledRef.current) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const freq = BASE_FREQ * FREQ_PATTERN[index % FREQ_PATTERN.length];

    // Dual oscillator for richer sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);

    // Quick attack and decay for bouncy feel
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.1);
  }, []);

  // Whammy sound - descending buzz (snake death) - SFX
  const playWhammy = useCallback(() => {
    if (!sfxEnabledRef.current) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(VOLUME * 2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  }, []);

  // Win sound - happy arpeggio (eating food) - SFX
  const playWin = useCallback(() => {
    if (!sfxEnabledRef.current) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
  }, []);

  // Set loop speed
  const setSpeed = useCallback((interval: number) => {
    speedRef.current = interval;
    // If running, restart with new speed
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        playTick(beatCountRef.current);
        beatCountRef.current++;
      }, speedRef.current);
    }
  }, [playTick]);

  // Start the music loop
  const startLoop = useCallback((interval?: number) => {
    if (intervalRef.current) return;

    if (interval) speedRef.current = interval;

    // Don't start if music is disabled
    if (!musicEnabledRef.current) {
      return;
    }

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    setIsPlaying(true);
    beatCountRef.current = 0;

    intervalRef.current = window.setInterval(() => {
      playTick(beatCountRef.current);
      beatCountRef.current++;
    }, speedRef.current);
  }, [playTick]);

  // Stop the music loop
  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Toggle SFX
  const toggleSfx = useCallback(() => {
    setSfxEnabled(prev => {
      const newEnabled = !prev;
      sfxEnabledRef.current = newEnabled;
      // Resume audio context on first interaction
      if (newEnabled) {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
      }
      return newEnabled;
    });
  }, []);

  // Toggle Music
  const toggleMusic = useCallback(() => {
    setMusicEnabled(prev => {
      const newEnabled = !prev;
      musicEnabledRef.current = newEnabled;
      if (newEnabled) {
        // Resume audio context on enable
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
      } else {
        // Stop the loop when disabling
        stopLoop();
      }
      return newEnabled;
    });
  }, [stopLoop]);

  // Legacy toggleMute - toggles both (for backwards compatibility)
  const toggleMute = useCallback(() => {
    toggleMusic();
  }, [toggleMusic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <AudioCtx.Provider value={{
      // SFX
      sfxEnabled,
      toggleSfx,
      playWhammy,
      playWin,

      // Music
      musicEnabled,
      isPlaying,
      toggleMusic,
      startLoop,
      stopLoop,
      setSpeed,

      // Legacy
      isMuted: !musicEnabled,
      toggleMute,
      playTick,
    }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioCtx);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
