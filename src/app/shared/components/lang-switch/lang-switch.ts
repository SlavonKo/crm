import { Component, inject, ApplicationRef, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LANG_KEY, LANGS } from '../../../core/config';

@Component({
  selector: 'app-lang-switch',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule, MatIconModule, MatButtonToggleModule, TranslocoModule, MatTooltipModule],
  templateUrl: './lang-switch.html',
  styleUrl: './lang-switch.scss',
})
export class LangSwitch implements OnInit {
  private readonly translocoService = inject(TranslocoService);
  private readonly appRef = inject(ApplicationRef);

  currentLang: LANGS = this.#resolveStoredLang();
  readonly Lang = LANGS;

  ngOnInit(): void {
    this.translocoService.setActiveLang(this.currentLang);
    document.documentElement.lang = this.currentLang;
  }

  setLang(lang: LANGS): void {
    if (lang === this.currentLang) return;
    this.currentLang = lang;
    this.translocoService.setActiveLang(lang);
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    this.appRef.tick();
  }

  #resolveStoredLang(): LANGS {
    const stored = localStorage.getItem(LANG_KEY);
    return stored && Object.values(LANGS).includes(stored as LANGS)
      ? (stored as LANGS)
      : LANGS.en;
  }
}
