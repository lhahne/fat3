import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pathToView, viewToPath, pushView } from './router';

describe('pathToView', () => {
  it('returns planner for /', () => {
    expect(pathToView('/')).toBe('planner');
  });

  it('returns planner for empty string', () => {
    expect(pathToView('')).toBe('planner');
  });

  it('returns tracking view for /tracking/:id', () => {
    expect(pathToView('/tracking/abc-123')).toEqual({ tracking: 'abc-123' });
  });

  it('returns tracking day view for /tracking/:id/day/:dayIndex', () => {
    expect(pathToView('/tracking/abc-123/day/3')).toEqual({ tracking: 'abc-123', day: 3 });
  });

  it('returns tracking without day for non-numeric day index', () => {
    expect(pathToView('/tracking/abc-123/day/foo')).toEqual({ tracking: 'abc-123' });
  });

  it('returns planner for unknown routes', () => {
    expect(pathToView('/unknown')).toBe('planner');
    expect(pathToView('/tracking')).toBe('planner');
    expect(pathToView('/tracking/')).toBe('planner');
  });
});

describe('viewToPath', () => {
  it('returns / for planner', () => {
    expect(viewToPath('planner')).toBe('/');
  });

  it('returns /tracking/:id for tracking view', () => {
    expect(viewToPath({ tracking: 'abc-123' })).toBe('/tracking/abc-123');
  });

  it('returns /tracking/:id/day/:dayIndex for tracking day view', () => {
    expect(viewToPath({ tracking: 'abc-123', day: 3 })).toBe('/tracking/abc-123/day/3');
  });
});

describe('pushView', () => {
  beforeEach(() => {
    // Reset to /
    window.history.replaceState(null, '', '/');
  });

  it('pushes state when URL differs', () => {
    const spy = vi.spyOn(window.history, 'pushState');
    pushView({ tracking: 'abc-123' });
    expect(spy).toHaveBeenCalledWith(null, '', '/tracking/abc-123');
  });

  it('pushes / for planner view', () => {
    window.history.replaceState(null, '', '/tracking/abc-123');
    const spy = vi.spyOn(window.history, 'pushState');
    pushView('planner');
    expect(spy).toHaveBeenCalledWith(null, '', '/');
  });

  it('pushes day URL for tracking day view', () => {
    const spy = vi.spyOn(window.history, 'pushState');
    pushView({ tracking: 'abc-123', day: 3 });
    expect(spy).toHaveBeenCalledWith(null, '', '/tracking/abc-123/day/3');
  });
});
