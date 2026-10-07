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
import { OrderStatus } from '../../../data/enums/order-status.enum';
import { getOrderBadgeClass, getOrderStatusLabel, ORDER_STATUS_OPTIONS } from '../order-status.helpers';
import { UahPipe } from '../../../shared/pipes/uah.pipe';
import { TranslocoModule } from '@jsverse/transloco';

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
    TranslocoModule,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail implements OnInit {
  readonly store         = inject(OrdersStore);
  readonly clientsStore  = inject(ClientsStore);
  readonly aiService     = inject(AiService);
  readonly #sanitizer    = inject(DomSanitizer);
  readonly #router       = inject(Router);

  readonly id = input.required<string>();

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

  // ─── Status helpers (shared, no duplication) ──────────────────────────────
  readonly statusOptions  = ORDER_STATUS_OPTIONS;
  readonly getBadgeClass  = getOrderBadgeClass;
  readonly getStatusLabel = getOrderStatusLabel;

  constructor() {
    effect(() => {
      this.store.loadOne(this.id());
    });
  }

  ngOnInit(): void {
    this.clientsStore.loadAll();
  }

  async onUpdateStatus(status: OrderStatus): Promise<void> {
    await this.store.updateStatus(this.id(), status);
  }

  async generateAiReceipt(): Promise<void> {
    const order  = this.store.activeOrder();
    const client = this.client();
    if (!order || !client) return;
    try {
      const html       = await this.aiService.generateReceiptHtml(order, client);
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
        `Motorcycle Make: ${this.motorcycle()?.make || 'Unknown'}, ` +
        `Model: ${this.motorcycle()?.model || 'Unknown'}, ` +
        `Mileage: ${this.motorcycle()?.currentMileage || 'Unknown'} km.`
      );
      this.aiAdvice.set(summary);
    } catch (err) {
      this.aiAdvice.set('Could not load AI advice at this time.');
      console.error(err);
    }
  }
}
