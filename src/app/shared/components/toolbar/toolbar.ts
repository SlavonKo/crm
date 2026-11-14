import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslocoModule } from '@jsverse/transloco';
import { LangSwitch } from '../lang-switch/lang-switch';
import { ThemeSwitch } from '../theme-switch/theme-switch';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';
import { OrdersStore } from '../../../features/orders/orders.store';
import { ModalsService } from '../../../features/modals/modals.service';

// ─── Toolbar ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    TranslocoModule,
    LangSwitch,
    ThemeSwitch,
  ],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar {
  readonly auth         = inject(AuthService);
  readonly #router      = inject(Router);
  readonly ordersStore  = inject(OrdersStore);
  readonly modalsService = inject(ModalsService);

  /** Controls the mobile nav drawer */
  readonly drawerOpen = signal(false);

  get upcomingCount(): number {
    return this.ordersStore.upcomingOrders().length;
  }

  toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  openUpcomingDates(): void {
    this.modalsService.openUpcomingDates();
  }

  signOut(): void {
    this.closeDrawer();
    this.auth.signOut();
    this.#router.navigate(['/login']);
  }
}
