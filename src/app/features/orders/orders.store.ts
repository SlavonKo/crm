import { computed, Injectable, signal } from '@angular/core';
import { WorkOrder, CreateWorkOrderPayload } from '../../data/models/work-order.model';
import { OrderStatus } from '../../data/enums/order-status.enum';
import { MOCK_ORDERS } from '../../data/mock';

let orderIdCounter = 100;

/**
 * OrdersStore — Signal-based state store for the Work Orders feature.
 * Currently backed by in-memory mock data. Firebase integration is planned
 * for a later phase — all public method signatures are intentionally identical
 * to the Firestore version so the switch will be transparent to components.
 */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  // ─── Writable state ────────────────────────────────────────────────────────

  readonly orders      = signal<WorkOrder[]>([...MOCK_ORDERS]);
  readonly activeOrder = signal<WorkOrder | null>(null);
  readonly isLoading   = signal(false);
  readonly error       = signal<string | null>(null);
  readonly filter      = signal<OrderStatus | 'all'>('all');

  // ─── Derived (computed) state ─────────────────────────────────────────────

  readonly filteredOrders = computed(() => {
    const f = this.filter();
    return f === 'all'
      ? this.orders()
      : this.orders().filter(o => o.status === f);
  });

  readonly openOrdersCount = computed(() =>
    this.orders().filter(o =>
      o.status === OrderStatus.PENDING ||
      o.status === OrderStatus.IN_PROGRESS ||
      o.status === OrderStatus.WAITING_PARTS
    ).length
  );

  readonly totalRevenue = computed(() =>
    this.orders()
      .filter(o => o.status === OrderStatus.INVOICED || o.status === OrderStatus.COMPLETED)
      .reduce((sum, o) => sum + o.totalCost, 0)
  );

  readonly ordersByStatus = computed(() => {
    const result = {} as Record<OrderStatus, number>;
    for (const status of Object.values(OrderStatus)) {
      result[status] = this.orders().filter(o => o.status === status).length;
    }
    return result;
  });

  // ─── Actions ──────────────────────────────────────────────────────────────

  async loadAll(): Promise<void> {
    // Data is pre-loaded from mock; nothing to fetch.
  }

  async loadByClient(clientId: string): Promise<void> {
    // Data is already in memory; components should use a computed filter instead.
  }

  async loadOne(id: string): Promise<void> {
    const order = this.orders().find(o => o.id === id) ?? null;
    this.activeOrder.set(order);
  }

  async create(payload: CreateWorkOrderPayload): Promise<string> {
    const id = `order-${++orderIdCounter}`;
    const now = new Date();
    const newOrder: WorkOrder = { id, ...payload, createdAt: now, updatedAt: now };
    this.orders.update(list => [...list, newOrder]);
    return id;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    return this.update(id, {
      status,
      ...(status === OrderStatus.COMPLETED ? { completedAt: new Date() } : {}),
    });
  }

  async update(id: string, patch: Partial<WorkOrder>): Promise<void> {
    this.orders.update(list =>
      list.map(o => o.id === id ? { ...o, ...patch, updatedAt: new Date() } : o)
    );
    if (this.activeOrder()?.id === id) {
      this.activeOrder.update(o => o ? { ...o, ...patch, updatedAt: new Date() } : null);
    }
  }

  async attachAiReceipt(id: string, receiptHtml: string, promptUsed: string): Promise<void> {
    return this.update(id, { aiGeneratedReceiptHtml: receiptHtml, aiPromptUsed: promptUsed });
  }

  setFilter(status: OrderStatus | 'all'): void {
    this.filter.set(status);
  }

  setActiveOrder(order: WorkOrder | null): void {
    this.activeOrder.set(order);
  }
}
