import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { OrdersStore } from '../../orders/orders.store';
import { UahPipe } from '../../../shared/pipes/uah.pipe';

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
  templateUrl: './add-event-dialog.html',
  styleUrl: './add-event-dialog.scss',
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
