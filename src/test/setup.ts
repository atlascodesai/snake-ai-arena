import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebGL context for Three.js
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return {
      canvas: {},
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createBuffer: vi.fn(),
      createFramebuffer: vi.fn(),
      createProgram: vi.fn(),
      createRenderbuffer: vi.fn(),
      createShader: vi.fn(),
      createTexture: vi.fn(),
      bindBuffer: vi.fn(),
      bindFramebuffer: vi.fn(),
      bindRenderbuffer: vi.fn(),
      bindTexture: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      viewport: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      blendFunc: vi.fn(),
      depthFunc: vi.fn(),
      cullFace: vi.fn(),
      frontFace: vi.fn(),
    };
  }
  return null;
});

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 },
  })),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 },
    type: 'sine',
  })),
  destination: {},
  currentTime: 0,
}));
