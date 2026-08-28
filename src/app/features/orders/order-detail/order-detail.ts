import { Component, OnInit, effect, inject, input, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrdersStore } from '../orders.store';
import { ClientsStore } from '../../clients/clients.store';
import { AiService } from '../../ai-assistant/ai.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { OrderStatus, ORDER_STATUS_LABELS } from '../../../data/enums/order-status.enum';
import { UahPipe } from '../../../shared/pipes/uah.pipe';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    UahPipe,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {
  readonly store        = inject(OrdersStore);
  readonly clientsStore = inject(ClientsStore);
  readonly aiService     = inject(AiService);
  readonly #sanitizer    = inject(DomSanitizer);
  readonly #router       = inject(Router);

  // Modern input signal bound to route parameter :id
  readonly id = input.required<string>();

  // Diagnostic advice text signal
  readonly aiAdvice = signal<string | null>(null);

  readonly safeReceiptHtml = computed<SafeHtml | null>(() => {
    const html = this.store.activeOrder()?.aiGeneratedReceiptHtml;
    return html ? this.#sanitizer.bypassSecurityTrustHtml(html) : null;
  });

  readonly client = computed(() => {
    const o = this.store.activeOrder();
    if (!o) return null;
    return this.clientsStore.clients().find(c => c.id === o.clientId) ?? null;
  });

  readonly motorcycle = computed(() => {
    const o = this.store.activeOrder();
    if (!o) return null;
    return this.clientsStore.motorcycles().find(m => m.id === o.motorcycleId) ?? null;
  });

  readonly statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => ({
    value: k as OrderStatus,
    label: v,
  }));

  constructor() {
    effect(() => {
      const orderId = this.id();
      this.store.loadOne(orderId);
    });
  }

  ngOnInit(): void {
    this.clientsStore.loadAll();
  }

  async onUpdateStatus(status: OrderStatus): Promise<void> {
    await this.store.updateStatus(this.id(), status);
  }

  async generateAiReceipt(): Promise<void> {
    const order = this.store.activeOrder();
    const client = this.client();
    if (!order || !client) return;

    try {
      const html = await this.aiService.generateReceiptHtml(order, client);
      const promptUsed = `Receipt HTML request for order: ${order.title}`;
      await this.store.attachAiReceipt(order.id, html, promptUsed);
    } catch (err) {
      console.error('Error generating AI receipt', err);
    }
  }

  async fetchAiAdvice(): Promise<void> {
    const order = this.store.activeOrder();
    if (!order) return;

    try {
      this.aiAdvice.set('Asking AI for advice...');
      const summary = await this.aiService.generateDiagnosticSummary(
        `Problem Description: ${order.description}\n` +
        `Motorcycle Make: ${this.motorcycle()?.make || 'Unknown'}, Model: ${this.motorcycle()?.model || 'Unknown'}, Mileage: ${this.motorcycle()?.currentMileage || 'Unknown'} km.`
      );
      this.aiAdvice.set(summary);
    } catch (err) {
      this.aiAdvice.set('Could not load AI advice at this time.');
      console.error(err);
    }
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
