import { Component, OnInit, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrdersStore } from '../orders.store';
import { ClientsStore } from '../../clients/clients.store';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { OrderStatus } from '../../../data/enums/order-status.enum';
import { getOrderBadgeClass, getOrderStatusLabel, ORDER_STATUS_FILTER_OPTIONS } from '../order-status.helpers';
import { UahPipe } from '../../../shared/pipes/uah.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    UahPipe,
    TranslocoModule,
  ],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList implements OnInit {
  readonly store        = inject(OrdersStore);
  readonly clientsStore = inject(ClientsStore);
  readonly #router       = inject(Router);

  // ─── Status helpers (shared, no duplication) ──────────────────────────────
  readonly statusOptions  = ORDER_STATUS_FILTER_OPTIONS;
  readonly getBadgeClass  = getOrderBadgeClass;
  readonly getStatusLabel = getOrderStatusLabel;

  ngOnInit(): void {
    this.store.loadAll();
    this.clientsStore.loadAll();
  }

  getClientName(clientId: string, manualLabel?: string): string {
    if (manualLabel) return manualLabel;
    const client = this.clientsStore.clients().find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : clientId || '—';
  }

  getMotorcycleName(motoId: string, manualLabel?: string): string {
    if (manualLabel) return manualLabel;
    const moto = this.clientsStore.motorcycles().find(m => m.id === motoId);
    return moto ? `${moto.make} ${moto.model} (${moto.year})` : motoId || '—';
  }

  onFilterChange(status: string): void {
    this.store.setFilter(status as OrderStatus | 'all');
  }

  viewOrderDetails(orderId: string): void {
    this.#router.navigate(['/orders', orderId]);
  }
}
