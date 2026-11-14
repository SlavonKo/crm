import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
  templateUrl: './add-inventory-item-dialog.html',
  styleUrl: './add-inventory-item-dialog.scss',
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
