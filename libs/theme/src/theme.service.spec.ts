import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ThemeName } from './theme.model';

// ---------------------------------------------------------------------------
// Minimal reactive mocks for @angular/core and @angular/common.
// vi.mock is hoisted — these run before any imports, so the factories are
// available when `theme.service.ts` is imported below.
// ---------------------------------------------------------------------------

/** Shared localStorage mock — mutated per-test via Object.assign. */
const lsMock: Record<string, string> = {};

/** Registry of effects so signal.set() can trigger them. */
const effectRegistry: Array<() => void> = [];

vi.mock('@angular/core', () => {
  type WritableSignal<T> = (() => T) & { set(v: T): void };

  function signal<T>(initial: T): WritableSignal<T> {
    let value = initial;
    const s = (() => value) as WritableSignal<T>;
    s.set = (v: T) => {
      value = v;
      effectRegistry.forEach(fn => fn());
    };
    return s;
  }

  function effect(fn: () => void) {
    effectRegistry.push(fn);
    fn(); // run immediately on init
    return { destroy: vi.fn() };
  }

  return {
    Injectable: () => (target: unknown) => target,
    signal,
    computed: <T>(fn: () => T) => fn,
    effect,
    inject: vi.fn(),
    PLATFORM_ID: 'PLATFORM_ID',
  };
});

vi.mock('@angular/common', () => ({
  isPlatformBrowser: () => true,
}));

// ---------------------------------------------------------------------------
// Patch global localStorage BEFORE we import the service so that
// restoreTheme() reads from our mock on every `new ThemeService()` call.
// ---------------------------------------------------------------------------

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => lsMock[key] ?? null,
    setItem: (key: string, value: string) => { lsMock[key] = value; },
    removeItem: (key: string) => { delete lsMock[key]; },
    clear: () => { Object.keys(lsMock).forEach(k => delete lsMock[k]); },
  },
  writable: true,
});

// Now import the service (the mock above will be active)
import { ThemeService } from './theme.service';

// ---------------------------------------------------------------------------

describe('ThemeService', () => {
  function createService(): ThemeService {
    return new (ThemeService as unknown as new () => ThemeService)();
  }

  beforeEach(() => {
    // Clear state
    Object.keys(lsMock).forEach(k => delete lsMock[k]);
    effectRegistry.length = 0;
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
  });

  afterEach(() => {
    effectRegistry.length = 0;
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
  });

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------
  describe('initialization', () => {
    it('defaults to "default" when localStorage is empty', () => {
      const svc = createService();
      expect(svc.currentTheme()).toBe('default');
    });

    it('applies [data-theme="default"] to documentElement on init', () => {
      createService();
      expect(document.documentElement.getAttribute('data-theme')).toBe('default');
    });

    it('restores a previously stored theme from localStorage', () => {
      lsMock['zitro_theme'] = 'dark';
      const svc = createService();
      expect(svc.currentTheme()).toBe('dark');
    });

    it('falls back to "default" when stored value is not a valid ThemeName', () => {
      lsMock['zitro_theme'] = 'invalid-theme';
      const svc = createService();
      expect(svc.currentTheme()).toBe('default');
    });

    it('persists the initial theme to localStorage on startup', () => {
      createService();
      expect(lsMock['zitro_theme']).toBe('default');
    });
  });

  // -------------------------------------------------------------------------
  // setTheme
  // -------------------------------------------------------------------------
  describe('setTheme', () => {
    const themes: ThemeName[] = ['default', 'dark', 'nature', 'ocean'];

    it.each(themes)('updates currentTheme signal to "%s"', (theme) => {
      const svc = createService();
      svc.setTheme(theme);
      expect(svc.currentTheme()).toBe(theme);
    });

    it('persists the selected theme to localStorage under "zitro_theme"', () => {
      const svc = createService();
      svc.setTheme('ocean');
      expect(lsMock['zitro_theme']).toBe('ocean');
    });

    it('applies [data-theme] attribute to documentElement', () => {
      const svc = createService();
      svc.setTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('updates [data-theme] when theme is switched multiple times', () => {
      const svc = createService();
      svc.setTheme('nature');
      svc.setTheme('ocean');
      expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
      expect(lsMock['zitro_theme']).toBe('ocean');
    });
  });

  // -------------------------------------------------------------------------
  // theme$ computed
  // -------------------------------------------------------------------------
  describe('theme$ computed', () => {
    it('reflects the initial theme', () => {
      const svc = createService();
      expect(svc.theme$()).toBe('default');
    });

    it('reflects the theme after setTheme()', () => {
      const svc = createService();
      svc.setTheme('nature');
      expect(svc.theme$()).toBe('nature');
    });
  });

  // -------------------------------------------------------------------------
  // applyTokenOverrides
  // -------------------------------------------------------------------------
  describe('applyTokenOverrides', () => {
    it('sets CSS custom properties on document.documentElement', () => {
      const svc = createService();
      svc.applyTokenOverrides({
        '--zitro-primary': '#FF0000',
        '--zitro-surface': '#000000',
      });
      expect(document.documentElement.style.getPropertyValue('--zitro-primary')).toBe('#FF0000');
      expect(document.documentElement.style.getPropertyValue('--zitro-surface')).toBe('#000000');
    });
  });

  // -------------------------------------------------------------------------
  // clearTokenOverrides
  // -------------------------------------------------------------------------
  describe('clearTokenOverrides', () => {
    it('removes previously set inline CSS properties', () => {
      const svc = createService();
      document.documentElement.style.setProperty('--zitro-primary', '#FF0000');
      svc.clearTokenOverrides(['--zitro-primary']);
      expect(document.documentElement.style.getPropertyValue('--zitro-primary')).toBe('');
    });
  });
});
