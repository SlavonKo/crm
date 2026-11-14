import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule } from '@jsverse/transloco';
import { Motorcycle } from '../../../data/models/motorcycle.model';
import { MotorcycleType, MOTORCYCLE_TYPE_LABELS } from '../../../data/enums/motorcycle-type.enum';

const TYPE_OPTIONS = Object.entries(MOTORCYCLE_TYPE_LABELS).map(([k, v]) => ({
  value: k as MotorcycleType,
  label: v,
}));

@Component({
  selector: 'app-edit-motorcycle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslocoModule,
  ],
  templateUrl: './edit-motorcycle-dialog.html',
  styleUrl: './edit-motorcycle-dialog.scss',
})
export class EditMotorcycleDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditMotorcycleDialogComponent>);
  readonly data      = inject<Motorcycle>(MAT_DIALOG_DATA);
  readonly #fb       = inject(FormBuilder);
  readonly typeOptions = TYPE_OPTIONS;

  readonly form: FormGroup = this.#fb.group({
    vin:            [this.data.vin,            [Validators.required, Validators.minLength(17), Validators.maxLength(17)]],
    make:           [this.data.make,           Validators.required],
    model:          [this.data.model,          Validators.required],
    year:           [this.data.year,           [Validators.required, Validators.min(1900)]],
    currentMileage: [this.data.currentMileage, [Validators.required, Validators.min(0)]],
    type:           [this.data.type,           Validators.required],
    licensePlate:   [this.data.licensePlate ?? ''],
    color:          [this.data.color ?? ''],
  });

  onSubmit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.value);
  }
}
