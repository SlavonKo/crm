import { Component, OnInit, inject, computed } from '@angular/core';
import { CalendarStore, CalendarEvent, CalendarViewMode } from '../calendar.store';
import { ClientsStore } from '../../clients/clients.store';
import { OrdersStore } from '../../orders/orders.store';
import { UahPipe } from '../../../shared/pipes/uah.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { ModalsService } from '../../modals/modals.service';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    TranslocoModule,
  ],
  templateUrl: './calendar-view.html',
  styleUrl: './calendar-view.scss',
})
export class CalendarView implements OnInit {
  readonly store        = inject(CalendarStore);
  readonly clientsStore = inject(ClientsStore);
  readonly ordersStore  = inject(OrdersStore);
  readonly #modalsService = inject(ModalsService);

  readonly todayDateString = new Date().toDateString();
  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly currentWeekDays = computed(() => {
    const active = this.store.activeDate();
    const start = this.#startOfWeek(active);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  });

  readonly displayDateLabel = computed(() => {
    const active = this.store.activeDate();
    const mode = this.store.viewMode();
    if (mode === 'day') {
      return active.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (mode === 'month') {
      return active.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    } else {
      const days = this.currentWeekDays();
      const startStr = days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endStr = days[6].toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
  });

  ngOnInit(): void {
    this.clientsStore.loadAll();
    this.ordersStore.loadAll();
    this.#loadEvents();
  }

  #loadEvents(): void {
    const active = this.store.activeDate();
    // Load window from -30 days to +60 days for active calendar context
    const from = new Date(active);
    from.setDate(active.getDate() - 35);
    const to = new Date(active);
    to.setDate(active.getDate() + 65);
    this.store.loadRange(from, to);
  }

  setViewMode(mode: CalendarViewMode): void {
    this.store.setViewMode(mode);
  }

  navigate(direction: 'prev' | 'next' | 'today'): void {
    const current = new Date(this.store.activeDate());
    const mode = this.store.viewMode();

    if (direction === 'today') {
      this.store.setActiveDate(new Date());
    } else {
      const offset = direction === 'next' ? 1 : -1;
      if (mode === 'day') {
        current.setDate(current.getDate() + offset);
      } else if (mode === 'month') {
        current.setMonth(current.getMonth() + offset);
      } else {
        current.setDate(current.getDate() + (offset * 7));
      }
      this.store.setActiveDate(current);
    }
    this.#loadEvents();
  }

  async openAddEventDialog(): Promise<void> {
    const result = await this.#modalsService.openAddEvent();
    if (result) {
      await this.store.createEvent(result);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (confirm('Delete this scheduled event?')) {
      await this.store.deleteEvent(eventId);
    }
  }

  #startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
