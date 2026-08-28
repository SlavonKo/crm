import { Component, OnInit, inject } from '@angular/core';
import { InventoryStore } from '../inventory.store';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { UahPipe } from '../../../shared/pipes/uah.pipe';
import { InventoryItem } from '../../../data/models/inventory-item.model';

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
  ],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.scss',
})
export class InventoryList implements OnInit {
  readonly store   = inject(InventoryStore);
  readonly #dialog  = inject(MatDialog);

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

  openAddItemDialog(): void {
    const dialogRef = this.#dialog.open(AddInventoryItemDialogComponent, {
      width: '500px',
      autoFocus: 'first-tab',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.store.create(result);
      }
    });
  }
}

/**
 * Dialog component for adding an inventory item
 */
@Component({
  selector: 'app-add-inventory-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title class="!text-xl !font-bold">Add Inventory Item</h2>
    <form [formGroup]="itemForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="flex flex-col gap-4 !pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Part Name</mat-label>
          <input matInput formControlName="name" placeholder="Motul 7100 4T 10W-40 1L" required>
          <mat-error *ngIf="itemForm.get('name')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku" placeholder="MOT-7100-10W40" required>
            <mat-error *ngIf="itemForm.get('sku')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Category</mat-label>
            <input matInput formControlName="category" placeholder="Lubricants" required>
            <mat-error *ngIf="itemForm.get('category')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Quantity in Stock</mat-label>
            <input matInput type="number" formControlName="quantity" required>
            <mat-error *ngIf="itemForm.get('quantity')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Min Alert Threshold</mat-label>
            <input matInput type="number" formControlName="minThreshold" required>
            <mat-error *ngIf="itemForm.get('minThreshold')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Unit Price (EUR)</mat-label>
            <input matInput type="number" formControlName="unitPrice" required>
            <mat-error *ngIf="itemForm.get('unitPrice')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Brand (Optional)</mat-label>
            <input matInput formControlName="brand" placeholder="Motul">
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Location / Bin Code (Optional)</mat-label>
            <input matInput formControlName="location" placeholder="Shelf A-4">
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Supplier Name (Optional)</mat-label>
            <input matInput formControlName="supplierName" placeholder="MotoDistributor Ltd">
          </mat-form-field>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="!pb-4 !px-6 gap-2">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="itemForm.invalid">
          Add Part
        </button>
      </mat-dialog-actions>
    </form>
  `
})
export class AddInventoryItemDialogComponent {
  readonly #fb = inject(FormBuilder);
  readonly #dialogRef = inject(MatDialog);

  readonly itemForm: FormGroup = this.#fb.group({
    name: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    category: ['', [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    minThreshold: [2, [Validators.required, Validators.min(0)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    brand: [''],
    location: [''],
    supplierName: [''],
  });

  onSubmit(): void {
    if (this.itemForm.valid) {
      const ref = this.#dialogRef.openDialogs.find(d => d.componentInstance === this);
      ref?.close(this.itemForm.value);
    }
  }
}
