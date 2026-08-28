import { Component, computed, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Motorcycle, MotorcycleStatus } from '../../../data/models/motorcycle.model';

/**
 * MotoCardComponent — Reusable UI component representing a motorcycle in the fleet.
 *
 * Displays model year, status badge, mileage, service recommendations, and quick actions.
 */
@Component({
  selector: 'app-moto-card',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './moto-card.html',
  styleUrl: './moto-card.scss',
})
export class MotoCardComponent {
  // ─── Input Signals ─────────────────────────────────────────────────────────

  readonly motorcycle = input.required<Motorcycle>();
  readonly status     = input<MotorcycleStatus>('Active');

  // ─── Output Signals ────────────────────────────────────────────────────────

  readonly newOrder = output<Motorcycle>();
  readonly editInfo = output<Motorcycle>();
  readonly archive  = output<Motorcycle>();

  // ─── Computed Values ───────────────────────────────────────────────────────

  readonly displayTitle = computed(() => {
    const m = this.motorcycle();
    return `${m.make} ${m.model} (${m.year})`;
  });

  readonly lastService = computed(() => {
    const history = this.motorcycle().serviceHistory || [];
    if (history.length === 0) return null;
    const sorted = [...history].sort((a, b) => b.date.getTime() - a.date.getTime());
    return sorted[0];
  });

  readonly nextServiceMileage = computed(() => {
    const current = this.motorcycle().currentMileage;
    // Estimate service interval of 5000 units
    const lastMil = this.lastService()?.mileageAtService ?? 0;
    const nextRecommended = lastMil > 0 ? lastMil + 5000 : current + 5000;
    return Math.max(nextRecommended, current + 500);
  });
}
