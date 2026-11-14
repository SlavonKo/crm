import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClientsStore } from '../clients.store';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { ModalsService } from '../../modals/modals.service';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    TranslocoModule,
  ],
  templateUrl: './clients-list.html',
  styleUrl: './clients-list.scss',
})
export class ClientsList implements OnInit {
  readonly store   = inject(ClientsStore);
  readonly #router  = inject(Router);
  readonly #modalsService = inject(ModalsService);

  ngOnInit(): void {
    this.store.loadAll();
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setSearch(value);
  }

  viewClientDetails(clientId: string): void {
    this.store.select(clientId);
    this.#router.navigate(['/clients', clientId]);
  }

  async openAddClientDialog(): Promise<void> {
    const result = await this.#modalsService.openAddClient();
    if (result) {
      await this.store.create(result);
    }
  }
}
