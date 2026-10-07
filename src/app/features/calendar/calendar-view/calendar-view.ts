import { Component, OnInit, inject, computed } from '@angular/core';
import { CalendarStore, CalendarEvent, CalendarViewMode } from '../calendar.store';
import { ClientsStore } from '../../clients/clients.store';
import { OrdersStore } from '../../orders/orders.store';
import { UahPipe } from '../../../shared/pipes/uah.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

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
  readonly #dialog       = inject(MatDialog);

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

  openAddEventDialog(): void {
    const dialogRef = this.#dialog.open(AddEventDialogComponent, {
      width: '500px',
      autoFocus: 'first-tab',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.store.createEvent(result);
      }
    });
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

/**
 * Dialog for scheduling new garage appointments
 */
@Component({
  selector: 'app-add-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    UahPipe,
  ],
  template: `
    <h2 mat-dialog-title class="!text-xl !font-bold">Schedule Appointment</h2>
    <form [formGroup]="eventForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="flex flex-col gap-4 !pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Event Title</mat-label>
          <input matInput formControlName="title" placeholder="Suzuki GSX-R1000 Valve Clearance" required>
          <mat-error *ngIf="eventForm.get('title')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Start Time</mat-label>
            <input matInput type="datetime-local" formControlName="startStr" required>
            <mat-error *ngIf="eventForm.get('startStr')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>End Time</mat-label>
            <input matInput type="datetime-local" formControlName="endStr" required>
            <mat-error *ngIf="eventForm.get('endStr')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Select Work Order (Optional)</mat-label>
            <mat-select formControlName="orderId">
              <mat-option [value]="null">None</mat-option>
              <mat-option *ngFor="let o of ordersStore.orders()" [value]="o.id">
                {{ o.title }} (Total: {{ o.totalCost | uah }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Event Color Code</mat-label>
            <mat-select formControlName="color">
              <mat-option value="#4f46e5">Indigo (Regular)</mat-option>
              <mat-option value="#0ea5e9">Sky Blue (Diagnostic)</mat-option>
              <mat-option value="#f59e0b">Amber (Waiting Parts)</mat-option>
              <mat-option value="#10b981">Emerald (Completion)</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Notes (Optional)</mat-label>
          <textarea matInput formControlName="notes" placeholder="Notes for tech or setup requirements..." rows="3"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="!pb-4 !px-6 gap-2">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="eventForm.invalid">
          Schedule
        </button>
      </mat-dialog-actions>
    </form>
  `
})
export class AddEventDialogComponent {
  readonly #fb = inject(FormBuilder);
  readonly #dialogRef = inject(MatDialog);
  readonly ordersStore = inject(OrdersStore);

  readonly eventForm: FormGroup = this.#fb.group({
    title: ['', [Validators.required]],
    startStr: ['', [Validators.required]],
    endStr: ['', [Validators.required]],
    orderId: [null],
    color: ['#4f46e5', [Validators.required]],
    notes: [''],
  });

  onSubmit(): void {
    if (this.eventForm.valid) {
      const val = this.eventForm.value;
      const ref = this.#dialogRef.openDialogs.find(d => d.componentInstance === this);
      ref?.close({
        title: val.title,
        start: new Date(val.startStr),
        end: new Date(val.endStr),
        orderId: val.orderId || undefined,
        color: val.color,
        notes: val.notes,
      });
    }
  }
}
