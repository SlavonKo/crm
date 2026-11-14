import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-add-client-dialog',
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
  templateUrl: './add-client-dialog.html',
  styleUrl: './add-client-dialog.scss',
})
export class AddClientDialogComponent {
  readonly dialogRef  = inject(MatDialogRef<AddClientDialogComponent>);
  readonly #fb        = inject(FormBuilder);

  readonly clientForm: FormGroup = this.#fb.group({
    firstName:     ['', [Validators.required]],
    lastName:      ['', [Validators.required]],
    phone:         ['', [Validators.required]],
    email:         ['', [Validators.email]],
    address:       [''],
    notes:         [''],
    motorcycleIds: [[]],
  });

  onSubmit(): void {
    if (this.clientForm.valid) {
      this.dialogRef.close(this.clientForm.value);
    }
  }
}
