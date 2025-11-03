import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';
import { THEME_KEY, THEMES } from '../../../core/config';

@Component({
  selector: 'app-theme-switch',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslocoModule],
  templateUrl: './theme-switch.html',
  styleUrl: './theme-switch.scss',
})
export class ThemeSwitch implements OnInit {
  isDarkTheme: boolean = false;

  ngOnInit(): void {
    const savedTheme = localStorage.getItem(THEME_KEY) || THEMES.light;
    this.isDarkTheme = (savedTheme === THEMES.dark);
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
  }

  private applyTheme(): void {
    const themeToApply = this.isDarkTheme ? THEMES.dark : THEMES.light;
    document.body.classList.toggle(THEMES.dark, this.isDarkTheme);
    localStorage.setItem(THEME_KEY, themeToApply);
  }

  get themeIcon(): string {
    return this.isDarkTheme ? 'dark_mode' : 'light_mode';
  }
}
