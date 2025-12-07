import { describe, it, expect } from 'vitest';
import { DEFAULT_CONTROL_SCHEME, CONTROL_SCHEMES } from './controlSchemes';

describe('DEFAULT_CONTROL_SCHEME', () => {
  it('should have correct name and description', () => {
    expect(DEFAULT_CONTROL_SCHEME.name).toBe('Default');
    expect(DEFAULT_CONTROL_SCHEME.description).toBe('WASD/Arrows + O/K');
  });

  it('should have correct XZ movement keys', () => {
    const { xzKeys } = DEFAULT_CONTROL_SCHEME;

    // Up (forward) - W and ArrowUp
    expect(xzKeys.up).toContain('w');
    expect(xzKeys.up).toContain('W');
    expect(xzKeys.up).toContain('ArrowUp');

    // Down (backward) - S and ArrowDown
    expect(xzKeys.down).toContain('s');
    expect(xzKeys.down).toContain('S');
    expect(xzKeys.down).toContain('ArrowDown');

    // Left - A and ArrowLeft
    expect(xzKeys.left).toContain('a');
    expect(xzKeys.left).toContain('A');
    expect(xzKeys.left).toContain('ArrowLeft');

    // Right - D and ArrowRight
    expect(xzKeys.right).toContain('d');
    expect(xzKeys.right).toContain('D');
    expect(xzKeys.right).toContain('ArrowRight');
  });

  it('should have correct Y-axis keys (O for up, K for down)', () => {
    const { yKeys } = DEFAULT_CONTROL_SCHEME;

    // O for Y-up
    expect(yKeys.up).toContain('o');
    expect(yKeys.up).toContain('O');

    // K for Y-down
    expect(yKeys.down).toContain('k');
    expect(yKeys.down).toContain('K');
  });

  it('should have a hint string', () => {
    expect(DEFAULT_CONTROL_SCHEME.hint).toBe('WASD/Arrows + O/K');
  });
});

describe('CONTROL_SCHEMES', () => {
  it('should map all legacy control types to DEFAULT_CONTROL_SCHEME', () => {
    // All legacy control types should now use the unified default scheme
    expect(CONTROL_SCHEMES['wasd-zx']).toBe(DEFAULT_CONTROL_SCHEME);
    expect(CONTROL_SCHEMES['wasd-qe']).toBe(DEFAULT_CONTROL_SCHEME);
    expect(CONTROL_SCHEMES['arrows-ws']).toBe(DEFAULT_CONTROL_SCHEME);
  });

  it('should have entries for all expected control types', () => {
    const expectedTypes = ['wasd-zx', 'wasd-qe', 'arrows-ws'];
    expectedTypes.forEach(type => {
      expect(CONTROL_SCHEMES).toHaveProperty(type);
    });
  });
});

describe('Control scheme structure', () => {
  it('should have non-empty arrays for all key mappings', () => {
    const scheme = DEFAULT_CONTROL_SCHEME;

    expect(scheme.xzKeys.up.length).toBeGreaterThan(0);
    expect(scheme.xzKeys.down.length).toBeGreaterThan(0);
    expect(scheme.xzKeys.left.length).toBeGreaterThan(0);
    expect(scheme.xzKeys.right.length).toBeGreaterThan(0);
    expect(scheme.yKeys.up.length).toBeGreaterThan(0);
    expect(scheme.yKeys.down.length).toBeGreaterThan(0);
  });

  it('should support both lowercase and uppercase keys for WASD', () => {
    const { xzKeys } = DEFAULT_CONTROL_SCHEME;

    // Each direction should have both cases
    expect(xzKeys.up.filter(k => k === 'w' || k === 'W').length).toBe(2);
    expect(xzKeys.down.filter(k => k === 's' || k === 'S').length).toBe(2);
    expect(xzKeys.left.filter(k => k === 'a' || k === 'A').length).toBe(2);
    expect(xzKeys.right.filter(k => k === 'd' || k === 'D').length).toBe(2);
  });
});
