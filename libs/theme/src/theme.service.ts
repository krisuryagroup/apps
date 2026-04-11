import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeName, ThemeTokenOverrides } from './theme.model';

const THEME_STORAGE_KEY = 'zitro_theme';
const VALID_THEMES: ThemeName[] = ['default', 'dark', 'nature', 'ocean'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly currentTheme = signal<ThemeName>(this.restoreTheme());

  readonly theme$ = computed(() => this.currentTheme());

  constructor() {
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
      this.persistTheme(theme);
    });
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme.set(theme);
  }

  /**
   * Apply individual CSS custom property overrides at runtime.
   * Useful for backend-driven theme configs (e.g. per-business branding).
   */
  applyTokenOverrides(overrides: ThemeTokenOverrides): void {
    if (!this.isBrowser) return;
    const root = document.documentElement;
    for (const [token, value] of Object.entries(overrides)) {
      root.style.setProperty(token, value);
    }
  }

  /**
   * Remove all inline token overrides, reverting to stylesheet defaults.
   */
  clearTokenOverrides(tokens: string[]): void {
    if (!this.isBrowser) return;
    const root = document.documentElement;
    for (const token of tokens) {
      root.style.removeProperty(token);
    }
  }

  private applyTheme(theme: ThemeName): void {
    if (!this.isBrowser) return;
    document.documentElement.setAttribute('data-theme', theme);
  }

  private persistTheme(theme: ThemeName): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable in some environments
    }
  }

  private restoreTheme(): ThemeName {
    if (!this.isBrowser) return 'default';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && (VALID_THEMES as string[]).includes(stored)) {
        return stored as ThemeName;
      }
    } catch {
      // localStorage may be unavailable
    }
    return 'default';
  }
}
