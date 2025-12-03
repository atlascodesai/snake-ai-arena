/**
 * Global Audio Context
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

// PYL-style bouncing frequency pattern
const FREQ_PATTERN = [1, 1.25, 1.5, 1.25, 1, 0.8, 1, 1.33, 1.5, 1.33, 1, 0.9, 1.1, 1.4, 1.2, 1, 0.85, 1.15];
const BASE_FREQ = 400;
const VOLUME = 0.15;

interface AudioContextType {
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  playTick: (index: number) => void;
  playWhammy: () => void;
  playWin: () => void;
  startLoop: (interval?: number) => void;
  stopLoop: () => void;
  setSpeed: (interval: number) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const isMutedRef = useRef(isMuted);
  const speedRef = useRef(120);
  const pendingStartRef = useRef<number | null>(null);

  // Keep ref in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Auto-enable audio on first user interaction
  useEffect(() => {
    if (hasInteracted) return;

    const enableAudio = () => {
      setHasInteracted(true);
      setIsMuted(false);
      isMutedRef.current = false;

      // Resume any suspended audio context
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      // If there was a pending startLoop call, execute it now
      if (pendingStartRef.current !== null) {
        const interval = pendingStartRef.current;
        pendingStartRef.current = null;
        // Small delay to ensure state is updated
        setTimeout(() => {
          if (!intervalRef.current) {
            setIsPlaying(true);
            beatCountRef.current = 0;
            intervalRef.current = window.setInterval(() => {
              // Inline playTick logic to avoid stale closure
              if (isMutedRef.current) return;
              const ctx = getAudioContext();
              if (ctx.state === 'suspended') ctx.resume();
              const freq = BASE_FREQ * FREQ_PATTERN[beatCountRef.current % FREQ_PATTERN.length];
              const osc1 = ctx.createOscillator();
              const osc2 = ctx.createOscillator();
              const gain = ctx.createGain();
              osc1.type = 'square';
              osc1.frequency.setValueAtTime(freq, ctx.currentTime);
              osc2.type = 'sawtooth';
              osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
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
              beatCountRef.current++;
            }, interval);
          }
        }, 50);
      }

      // Remove listeners after first interaction
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    document.addEventListener('touchstart', enableAudio);

    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, [hasInteracted]);

  // Play a single tick/beep - PYL board bounce sound
  const playTick = useCallback((index: number) => {
    if (isMutedRef.current) return;

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

  // Whammy sound - descending buzz (snake death)
  const playWhammy = useCallback(() => {
    if (isMutedRef.current) return;

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

  // Win sound - happy arpeggio (eating food)
  const playWin = useCallback(() => {
    if (isMutedRef.current) return;

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

  // Start the loop
  const startLoop = useCallback((interval?: number) => {
    if (intervalRef.current) return;

    if (interval) speedRef.current = interval;

    // If not yet interacted, queue the start for when user interacts
    if (isMutedRef.current) {
      pendingStartRef.current = speedRef.current;
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

  // Stop the loop
  const stopLoop = useCallback(() => {
    pendingStartRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) {
        stopLoop();
      }
      return !prev;
    });
  }, [stopLoop]);

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
      isMuted,
      isPlaying,
      toggleMute,
      playTick,
      playWhammy,
      playWin,
      startLoop,
      stopLoop,
      setSpeed,
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
