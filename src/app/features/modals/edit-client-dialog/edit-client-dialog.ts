import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule } from '@jsverse/transloco';
import { Client } from '../../../data/models/client.model';

@Component({
  selector: 'app-edit-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslocoModule,
  ],
  templateUrl: './edit-client-dialog.html',
  styleUrl: './edit-client-dialog.scss',
})
export class EditClientDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditClientDialogComponent>);
  readonly data      = inject<Client>(MAT_DIALOG_DATA);
  readonly #fb       = inject(FormBuilder);

  readonly form: FormGroup = this.#fb.group({
    firstName: [this.data.firstName, Validators.required],
    lastName:  [this.data.lastName,  Validators.required],
    phone:     [this.data.phone,     Validators.required],
    email:     [this.data.email  ?? '', Validators.email],
    address:   [this.data.address ?? ''],
    notes:     [this.data.notes   ?? ''],
  });

  onSubmit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.value);
  }
}
