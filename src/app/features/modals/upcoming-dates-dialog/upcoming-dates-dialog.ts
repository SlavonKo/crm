import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, DatePipe } from '@angular/common';
import { OrdersStore } from '../../orders/orders.store';
import { ClientsStore } from '../../clients/clients.store';
import { WorkOrder } from '../../../data/models/work-order.model';
import { getOrderBadgeClass, getOrderStatusLabel } from '../../orders/order-status.helpers';

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
  templateUrl: './upcoming-dates-dialog.html',
  styleUrl: './upcoming-dates-dialog.scss',
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
