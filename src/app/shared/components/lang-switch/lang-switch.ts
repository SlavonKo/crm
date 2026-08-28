import { Component, inject, OnInit } from '@angular/core';
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
  protected readonly translocoService = inject(TranslocoService);
  currentLang: LANGS | string = localStorage?.['lang'] || LANGS.en;
  public readonly Lang = LANGS;

  ngOnInit(): void {
    this.initLang();
  }

  initLang(): void {
    const stored = localStorage?.getItem(LANG_KEY);
    this.currentLang = stored && Object.values(LANGS).includes(stored as LANGS)
      ? (stored as LANGS)
      : LANGS.en;
    this.translocoService.setActiveLang(this.currentLang);
    localStorage?.setItem(LANG_KEY, this.currentLang);
  }

  setLang(lang: LANGS): void {
    this.currentLang = lang;
    this.translocoService.setActiveLang(lang);
    localStorage?.setItem(LANG_KEY, this.currentLang);
  }
}
