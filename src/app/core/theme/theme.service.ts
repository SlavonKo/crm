import { effect, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'mw-crm-theme';

/**
 * ThemeService — manages the application's dark/light mode.
 *
 * The active theme is persisted to localStorage and applied by toggling
 * the `dark` class on <html>. Components read `mode` signal reactively.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.#resolveInitial());

  constructor() {
    // Reactively apply the class whenever the signal changes
    effect(() => {
      const isDark = this.mode() === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem(STORAGE_KEY, this.mode());
    });
  }

  toggle(): void {
    this.mode.update(m => (m === 'dark' ? 'light' : 'dark'));
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  #resolveInitial(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    // Respect OS preference on first visit
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
