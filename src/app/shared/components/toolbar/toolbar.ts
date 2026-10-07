import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslocoModule } from '@jsverse/transloco';
import { LangSwitch } from '../lang-switch/lang-switch';
import { ThemeSwitch } from '../theme-switch/theme-switch';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { OrdersStore } from '../../../features/orders/orders.store';
import { ClientsStore } from '../../../features/clients/clients.store';
import { WorkOrder } from '../../../data/models/work-order.model';
import { getOrderBadgeClass, getOrderStatusLabel } from '../../../features/orders/order-status.helpers';

// ─── Upcoming Dates Dialog ─────────────────────────────────────────────────

@Component({
  selector: 'app-upcoming-dates-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title class="!text-xl !font-bold flex items-center gap-2">
      <mat-icon class="text-amber-500">alarm</mat-icon>
      Найближчі дати замовлень
    </h2>

    <mat-dialog-content class="!max-h-[70vh] !min-w-[min(480px,90vw)]">
      @if (orders().length === 0) {
        <div class="flex flex-col items-center gap-3 py-10 text-slate-400">
          <mat-icon class="!text-5xl !w-12 !h-12">event_available</mat-icon>
          <p class="text-sm">Немає замовлень із запланованими датами на найближчі 7 днів</p>
        </div>
      } @else {
        <div class="flex flex-col gap-3 py-2">
          @for (order of orders(); track order.id) {
            <button
              type="button"
              (click)="openOrder(order.id)"
              class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700
                     bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400 hover:bg-indigo-50
                     dark:hover:bg-indigo-900/20 transition-colors text-left w-full cursor-pointer group">

              <!-- Date column -->
              <div class="flex flex-col items-center min-w-[56px] text-center">
                @if (order.scheduledDate) {
                  <span class="text-[10px] uppercase font-semibold text-slate-400 leading-tight">Запис</span>
                  <span class="text-lg font-black text-indigo-500 leading-tight">
                    {{ order.scheduledDate | date:'dd' }}
                  </span>
                  <span class="text-[11px] text-slate-500">
                    {{ order.scheduledDate | date:'MMM' }}
                  </span>
                } @else if (order.estimatedCompletionDate) {
                  <span class="text-[10px] uppercase font-semibold text-slate-400 leading-tight">Видача</span>
                  <span class="text-lg font-black text-emerald-500 leading-tight">
                    {{ order.estimatedCompletionDate | date:'dd' }}
                  </span>
                  <span class="text-[11px] text-slate-500">
                    {{ order.estimatedCompletionDate | date:'MMM' }}
                  </span>
                }
              </div>

              <!-- Info column -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                    {{ order.title }}
                  </span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    [class]="getBadgeClass(order.status)">
                    {{ getStatusLabel(order.status) }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                  <span class="flex items-center gap-1">
                    <mat-icon class="!w-3.5 !h-3.5 !text-sm">person</mat-icon>
                    {{ getClientName(order) }}
                  </span>
                  @if (order.scheduledDate) {
                    <span class="flex items-center gap-1">
                      <mat-icon class="!w-3.5 !h-3.5 !text-sm">schedule</mat-icon>
                      {{ order.scheduledDate | date:'HH:mm' }}
                    </span>
                  }
                  @if (order.estimatedCompletionDate && order.scheduledDate) {
                    <span class="flex items-center gap-1 text-emerald-600">
                      <mat-icon class="!w-3.5 !h-3.5 !text-sm">flag</mat-icon>
                      Видача: {{ order.estimatedCompletionDate | date:'dd MMM' }}
                    </span>
                  }
                </div>
              </div>

              <!-- Arrow hint -->
              <mat-icon class="!w-4 !h-4 !text-base text-slate-300 group-hover:text-indigo-400
                               transition-colors self-center shrink-0">
                chevron_right
              </mat-icon>
            </button>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!px-6 !pb-4">
      <button mat-button (click)="dialogRef.close()">Закрити</button>
    </mat-dialog-actions>
  `,
})
export class UpcomingDatesDialogComponent {
  readonly dialogRef    = inject(MatDialogRef<UpcomingDatesDialogComponent>);
  readonly #router      = inject(Router);
  readonly ordersStore  = inject(OrdersStore);
  readonly clientsStore = inject(ClientsStore);

  readonly orders = this.ordersStore.upcomingOrders;

  readonly getBadgeClass  = getOrderBadgeClass;
  readonly getStatusLabel = getOrderStatusLabel;

  openOrder(orderId: string): void {
    const order = this.orders().find(o => o.id === orderId) ?? null;
    this.ordersStore.setActiveOrder(order);
    this.dialogRef.close();
    this.#router.navigate(['/orders', orderId]);
  }

  getClientName(order: WorkOrder): string {
    if (order.manualClientLabel) return order.manualClientLabel;
    const client = this.clientsStore.clients().find(c => c.id === order.clientId);
    return client ? `${client.firstName} ${client.lastName}` : order.clientId || '—';
  }
}

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
  readonly #dialog      = inject(MatDialog);
  readonly ordersStore  = inject(OrdersStore);

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
    this.#dialog.open(UpcomingDatesDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: false,
    });
  }

  signOut(): void {
    this.closeDrawer();
    this.auth.signOut();
    this.#router.navigate(['/login']);
  }
}
