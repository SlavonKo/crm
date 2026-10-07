import { computed, Injectable, signal } from '@angular/core';
import { MOCK_CALENDAR_EVENTS } from '../../data/mock';
import { CalendarEvent, CalendarViewMode } from '../../data/models/calendar-event.model';

export type { CalendarEvent, CalendarViewMode };

let eventIdCounter = 100;

/**
 * CalendarStore — Signal-based state store for the Calendar/Scheduling feature.
 * Currently backed by in-memory mock data. Firebase integration is planned
 * for a later phase — all public method signatures are intentionally identical
 * to the Firestore version so the switch will be transparent to components.
 */
@Injectable({ providedIn: 'root' })
export class CalendarStore {
  // ─── Writable state ────────────────────────────────────────────────────────

  readonly events     = signal<CalendarEvent[]>([...MOCK_CALENDAR_EVENTS]);
  readonly activeDate = signal<Date>(new Date());
  readonly viewMode   = signal<CalendarViewMode>('week');
  readonly isLoading  = signal(false);
  readonly error      = signal<string | null>(null);

  // ─── Derived (computed) state ─────────────────────────────────────────────

  readonly eventsForActiveDate = computed(() => {
    const date = this.activeDate();
    return this.events().filter(e => {
      const d = new Date(e.start);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth()    === date.getMonth() &&
        d.getDate()     === date.getDate()
      );
    });
  });

  readonly eventsForActiveWeek = computed(() => {
    const date  = this.activeDate();
    const start = this.#startOfWeek(date);
    const end   = new Date(start);
    end.setDate(end.getDate() + 7);
    return this.events().filter(e => e.start >= start && e.start < end);
  });

  readonly upcomingEvents = computed(() => {
    const now = new Date();
    return this.events()
      .filter(e => e.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 10);
  });

  // ─── Actions ──────────────────────────────────────────────────────────────

  async loadRange(_from: Date, _to: Date): Promise<void> {
    // Data is pre-loaded from mock; nothing to fetch.
  }

  async createEvent(payload: Omit<CalendarEvent, 'id'>): Promise<string> {
    const id = `event-${++eventIdCounter}`;
    this.events.update(list => [...list, { id, ...payload }]);
    return id;
  }

  async updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<void> {
    this.events.update(list =>
      list.map(e => e.id === id ? { ...e, ...patch } : e)
    );
  }

  async deleteEvent(id: string): Promise<void> {
    this.events.update(list => list.filter(e => e.id !== id));
  }

  setActiveDate(date: Date): void {
    this.activeDate.set(date);
  }

  setViewMode(mode: CalendarViewMode): void {
    this.viewMode.set(mode);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  #startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
