import { Component, inject, OnInit } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { LangSwitch } from "../lang-switch/lang-switch";
import { ThemeSwitch } from '../theme-switch/theme-switch';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TranslocoModule,
    LangSwitch,
    ThemeSwitch
],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar implements OnInit {
  protected readonly translocoService = inject(TranslocoService);

  ngOnInit(): void {
    console.log('3');
    
  }
}
