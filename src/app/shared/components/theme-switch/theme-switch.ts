import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { THEME_KEY, THEMES } from '../../../core/config';

@Component({
  selector: 'app-theme-switch',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslocoModule],
  templateUrl: './theme-switch.html',
  styleUrl: './theme-switch.scss',
})
export class ThemeSwitch implements OnInit {
  isDarkTheme = false;

  ngOnInit(): void {
    const saved = localStorage.getItem(THEME_KEY) || THEMES.light;
    this.isDarkTheme = saved === THEMES.dark;
    this.#apply();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.#apply();
  }

  /**
   * Applies theme by toggling the `dark` class on <html>.
   *
   * - Tailwind `dark:` variants require `darkMode: 'class'` and the class on <html>.
   * - Material 3 `color-scheme: dark` is triggered via the same selector in styles.scss.
   * - We keep the legacy body class for backwards-compat with _vars.scss variables.
   */
  #apply(): void {
    const html = document.documentElement;
    const body = document.body;
    // Tailwind dark mode — class on <html>
    html.classList.toggle('dark', this.isDarkTheme);
    // Legacy vars + Material background — class on <body>
    body.classList.toggle(THEMES.dark,  this.isDarkTheme);
    body.classList.toggle(THEMES.light, !this.isDarkTheme);
    localStorage.setItem(THEME_KEY, this.isDarkTheme ? THEMES.dark : THEMES.light);
  }

  get themeIcon(): string {
    return this.isDarkTheme ? 'dark_mode' : 'light_mode';
  }
}
