import { Component, OnInit, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClientsStore } from '../clients.store';
import { OrdersStore } from '../../orders/orders.store';
import { MotoCardComponent } from '../../../shared/components/moto-card/moto-card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { Motorcycle, MotorcycleStatus } from '../../../data/models/motorcycle.model';
import { ModalsService } from '../../modals/modals.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MotoCardComponent,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    TranslocoModule,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
})
export class ClientDetail implements OnInit {
  readonly store       = inject(ClientsStore);
  readonly ordersStore = inject(OrdersStore);
  readonly #router      = inject(Router);
  readonly #modalsService = inject(ModalsService);

  readonly id = input.required<string>();

  constructor() {
    effect(() => {
      const clientId = this.id();
      this.store.select(clientId);
      this.store.loadOne(clientId);
    });
  }

  ngOnInit(): void {
    this.ordersStore.loadAll();
  }

  getMotorcycleStatus(moto: Motorcycle): MotorcycleStatus {
    if (moto.isArchived) return 'Archived';
    const activeOrder = this.ordersStore.orders().find(o =>
      o.motorcycleId === moto.id &&
      (o.status === 'in_progress' || o.status === 'pending' || o.status === 'waiting_parts')
    );
    return activeOrder ? 'In Workshop' : 'Active';
  }

  // ─── Edit client ─────────────────────────────────────────────────────────

  async onEditClient(): Promise<void> {
    const client = this.store.selectedClient();
    if (!client) return;

    const patch = await this.#modalsService.openEditClient(client);
    if (patch) {
      await this.store.update(client.id, patch);
    }
  }

  // ─── Add motorcycle ───────────────────────────────────────────────────────

  async openAddMotoDialog(): Promise<void> {
    const result = await this.#modalsService.openAddMotorcycle();
    if (result) {
      await this.store.addMotorcycle({ ...result, clientId: this.id() });
    }
  }

  // ─── Edit motorcycle ──────────────────────────────────────────────────────

  async onEditInfo(moto: Motorcycle): Promise<void> {
    const patch = await this.#modalsService.openEditMotorcycle(moto);
    if (patch) {
      await this.store.updateMotorcycle(moto.id, patch);
    }
  }

  // ─── Other actions ────────────────────────────────────────────────────────

  async onArchiveMoto(moto: Motorcycle): Promise<void> {
    if (confirm(`Архівувати ${moto.make} ${moto.model}?`)) {
      await this.store.archiveMotorcycle(moto.id);
    }
  }

  onNewOrder(moto: Motorcycle): void {
    this.#router.navigate(['/orders/new'], {
      queryParams: { clientId: this.id(), motorcycleId: moto.id },
    });
  }
}
