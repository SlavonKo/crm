import { Component, OnInit, inject } from '@angular/core';
import { InventoryStore } from '../inventory.store';
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
import { UahPipe } from '../../../shared/pipes/uah.pipe';
import { ModalsService } from '../../modals/modals.service';

@Component({
  selector: 'app-inventory-list',
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
    UahPipe,
    TranslocoModule,
  ],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.scss',
})
export class InventoryList implements OnInit {
  readonly store   = inject(InventoryStore);
  readonly #modalsService = inject(ModalsService);

  ngOnInit(): void {
    this.store.loadAll();
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setSearch(value);
  }

  async adjustQty(itemId: string, delta: number): Promise<void> {
    try {
      await this.store.adjustQuantity(itemId, delta);
    } catch (err) {
      console.error(err);
    }
  }

  async deleteItem(itemId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await this.store.delete(itemId);
      } catch (err) {
        console.error(err);
      }
    }
  }

  async openAddItemDialog(): Promise<void> {
    const result = await this.#modalsService.openAddInventoryItem();
    if (result) {
      await this.store.create(result);
    }
  }
}
