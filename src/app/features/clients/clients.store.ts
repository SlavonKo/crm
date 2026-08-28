import { computed, Injectable, signal } from '@angular/core';
import { Client } from '../../data/models/client.model';
import { Motorcycle } from '../../data/models/motorcycle.model';
import { MOCK_CLIENTS, MOCK_MOTORCYCLES } from '../../data/mock';

let clientIdCounter = 100;
let motoIdCounter   = 100;

/**
 * ClientsStore — Signal-based state store for the Clients feature.
 * Currently backed by in-memory mock data. Firebase integration is planned
 * for a later phase — all public method signatures are intentionally identical
 * to the Firestore version so the switch will be transparent to components.
 */
@Injectable({ providedIn: 'root' })
export class ClientsStore {
  // ─── Writable state ────────────────────────────────────────────────────────

  readonly clients      = signal<Client[]>([...MOCK_CLIENTS]);
  readonly motorcycles  = signal<Motorcycle[]>([...MOCK_MOTORCYCLES]);
  readonly selectedId   = signal<string | null>(null);
  readonly isLoading    = signal(false);
  readonly error        = signal<string | null>(null);
  readonly searchQuery  = signal('');
  readonly showArchived = signal(false);

  // ─── Derived (computed) state ─────────────────────────────────────────────

  readonly selectedClient = computed(() =>
    this.clients().find(c => c.id === this.selectedId()) ?? null
  );

  readonly totalClients = computed(() => this.clients().length);

  readonly filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.clients();
    return this.clients().filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly activeFleet = computed(() =>
    this.clients().filter(c => c.motorcycleIds.length > 0)
  );

  readonly currentFleet = computed(() => {
    const id = this.selectedId();
    if (!id) return [];
    const fleet = this.motorcycles().filter(m => m.clientId === id);
    return this.showArchived() ? fleet : fleet.filter(m => !m.isArchived);
  });

  // ─── Actions ──────────────────────────────────────────────────────────────

  async loadAll(): Promise<void> {
    // Data is pre-loaded from mock; nothing to fetch.
  }

  async loadOne(_id: string): Promise<void> {
    // Data is already in memory.
  }

  async create(payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `client-${++clientIdCounter}`;
    const now = new Date();
    const newClient: Client = { id, ...payload, createdAt: now, updatedAt: now };
    this.clients.update(list => [...list, newClient]);
    return id;
  }

  async update(id: string, patch: Partial<Client>): Promise<void> {
    this.clients.update(list =>
      list.map(c => c.id === id ? { ...c, ...patch, updatedAt: new Date() } : c)
    );
  }

  async addMotorcycle(
    payload: Omit<Motorcycle, 'id' | 'createdAt' | 'updatedAt' | 'serviceHistory' | 'isArchived'>
  ): Promise<string> {
    const id = `moto-${++motoIdCounter}`;
    const now = new Date();
    const newBike: Motorcycle = {
      id,
      ...payload,
      isArchived: false,
      serviceHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    this.motorcycles.update(list => [...list, newBike]);
    this.clients.update(list =>
      list.map(c => c.id === payload.clientId
        ? { ...c, motorcycleIds: [...c.motorcycleIds, id], updatedAt: new Date() }
        : c
      )
    );
    return id;
  }

  async updateMotorcycle(id: string, patch: Partial<Motorcycle>): Promise<void> {
    this.motorcycles.update(list =>
      list.map(m => m.id === id ? { ...m, ...patch, updatedAt: new Date() } : m)
    );
  }

  async archiveMotorcycle(id: string): Promise<void> {
    this.motorcycles.update(list =>
      list.map(m => m.id === id ? { ...m, isArchived: true, archivedAt: new Date(), updatedAt: new Date() } : m)
    );
  }

  async softDelete(_id: string): Promise<void> {
    throw new Error('Clients cannot be deleted — archive their motorcycles instead.');
  }

  select(id: string | null): void {
    this.selectedId.set(id);
  }

  setSearch(query: string): void {
    this.searchQuery.set(query);
  }

  toggleShowArchived(): void {
    this.showArchived.update(v => !v);
  }
}
