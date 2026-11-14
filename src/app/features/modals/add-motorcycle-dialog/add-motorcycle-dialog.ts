import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule } from '@jsverse/transloco';
import { MotorcycleType, MOTORCYCLE_TYPE_LABELS } from '../../../data/enums/motorcycle-type.enum';

const TYPE_OPTIONS = Object.entries(MOTORCYCLE_TYPE_LABELS).map(([k, v]) => ({
  value: k as MotorcycleType,
  label: v,
}));

@Component({
  selector: 'app-add-motorcycle-dialog',
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
  templateUrl: './add-motorcycle-dialog.html',
  styleUrl: './add-motorcycle-dialog.scss',
})
export class AddMotorcycleDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AddMotorcycleDialogComponent>);
  readonly #fb = inject(FormBuilder);
  readonly typeOptions = TYPE_OPTIONS;

  readonly form: FormGroup = this.#fb.group({
    vin:            ['', [Validators.required, Validators.minLength(17), Validators.maxLength(17)]],
    make:           ['', Validators.required],
    model:          ['', Validators.required],
    year:           [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
    currentMileage: [0, [Validators.required, Validators.min(0)]],
    type:           [MotorcycleType.OTHER, Validators.required],
    licensePlate:   [''],
    color:          [''],
  });

  onSubmit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.value);
  }
}
