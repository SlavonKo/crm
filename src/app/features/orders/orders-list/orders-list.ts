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
import { OrderStatus, ORDER_STATUS_LABELS } from '../../../data/enums/order-status.enum';
import { UahPipe } from '../../../shared/pipes/uah.pipe';

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
  ],
  templateUrl: './orders-list.html',
  styleUrl: './orders-list.scss',
})
export class OrdersList implements OnInit {
  readonly store        = inject(OrdersStore);
  readonly clientsStore = inject(ClientsStore);
  readonly #router       = inject(Router);

  readonly statusOptions = [
    { value: 'all', label: 'All Statuses' },
    ...Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => ({
      value: k as OrderStatus,
      label: v,
    })),
  ];

  ngOnInit(): void {
    this.store.loadAll();
    this.clientsStore.loadAll();
  }

  getClientName(clientId: string): string {
    const client = this.clientsStore.clients().find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Loading...';
  }

  getMotorcycleName(motoId: string): string {
    const moto = this.clientsStore.motorcycles().find(m => m.id === motoId);
    return moto ? `${moto.make} ${moto.model} (${moto.year})` : 'Loading...';
  }

  onFilterChange(status: string): void {
    this.store.setFilter(status as OrderStatus | 'all');
  }

  viewOrderDetails(orderId: string): void {
    this.#router.navigate(['/orders', orderId]);
  }

  getBadgeClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.DRAFT:
        return 'bg-slate-100 text-slate-700';
      case OrderStatus.PENDING:
        return 'bg-amber-100 text-amber-700';
      case OrderStatus.IN_PROGRESS:
        return 'bg-sky-100 text-sky-700';
      case OrderStatus.WAITING_PARTS:
        return 'bg-orange-100 text-orange-700';
      case OrderStatus.COMPLETED:
        return 'bg-green-150 text-green-700';
      case OrderStatus.INVOICED:
        return 'bg-indigo-100 text-indigo-700';
      case OrderStatus.CANCELLED:
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getStatusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status] || status;
  }
}
