import { computed, Injectable, signal } from '@angular/core';
import { InventoryItem, CreateInventoryItemPayload } from '../../data/models/inventory-item.model';
import { MOCK_INVENTORY } from '../../data/mock';

let itemIdCounter = 100;

/**
 * InventoryStore — Signal-based state store for the Inventory feature.
 * Currently backed by in-memory mock data. Firebase integration is planned
 * for a later phase — all public method signatures are intentionally identical
 * to the Firestore version so the switch will be transparent to components.
 */
@Injectable({ providedIn: 'root' })
export class InventoryStore {
  // ─── Writable state ────────────────────────────────────────────────────────

  readonly items       = signal<InventoryItem[]>([...MOCK_INVENTORY]);
  readonly isLoading   = signal(false);
  readonly error       = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly selectedId  = signal<string | null>(null);

  // ─── Derived (computed) state ─────────────────────────────────────────────

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      (i.brand?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly lowStockItems = computed(() =>
    this.items().filter(i => i.quantity <= i.minThreshold)
  );

  readonly totalStockValue = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  );

  readonly selectedItem = computed(() =>
    this.items().find(i => i.id === this.selectedId()) ?? null
  );

  // ─── Actions ──────────────────────────────────────────────────────────────

  async loadAll(): Promise<void> {
    // Data is pre-loaded from mock; nothing to fetch.
  }

  async create(payload: CreateInventoryItemPayload): Promise<string> {
    const id = `inv-${++itemIdCounter}`;
    const now = new Date();
    const newItem: InventoryItem = { id, ...payload, createdAt: now, updatedAt: now };
    this.items.update(list => [...list, newItem]);
    return id;
  }

  async update(id: string, patch: Partial<InventoryItem>): Promise<void> {
    this.items.update(list =>
      list.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date() } : i)
    );
  }

  async adjustQuantity(id: string, delta: number): Promise<void> {
    const item = this.items().find(i => i.id === id);
    if (!item) throw new Error(`InventoryStore: item ${id} not found`);
    const newQty = Math.max(0, item.quantity + delta);
    return this.update(id, {
      quantity: newQty,
      lastRestockedAt: delta > 0 ? new Date() : item.lastRestockedAt,
    });
  }

  async delete(id: string): Promise<void> {
    this.items.update(list => list.filter(i => i.id !== id));
  }

  setSearch(query: string): void {
    this.searchQuery.set(query);
  }

  select(id: string | null): void {
    this.selectedId.set(id);
  }
}
