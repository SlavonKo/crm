import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClientsStore } from '../clients.store';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

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
  readonly #dialog  = inject(MatDialog);

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

  openAddClientDialog(): void {
    const dialogRef = this.#dialog.open(AddClientDialogComponent, {
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
 * Dialog component for creating a new client record.
 * Uses MatDialogRef (not MatDialog) so close() works correctly.
 */
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
  template: `
    <h2 mat-dialog-title class="!text-xl !font-bold">{{ 'clients.dialog.title' | transloco }}</h2>
    <form [formGroup]="clientForm" (ngSubmit)="onSubmit()">

      <mat-dialog-content class="!max-h-[70vh]">
        <div class="flex flex-col gap-3 py-2">

          <div class="flex gap-3">
            <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
              <mat-label>{{ 'clients.dialog.firstName' | transloco }}</mat-label>
              <input matInput formControlName="firstName" placeholder="Іван" required>
              <mat-error *ngIf="clientForm.get('firstName')?.hasError('required')">
                {{ 'common.required' | transloco }}
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
              <mat-label>{{ 'clients.dialog.lastName' | transloco }}</mat-label>
              <input matInput formControlName="lastName" placeholder="Іваненко" required>
              <mat-error *ngIf="clientForm.get('lastName')?.hasError('required')">
                {{ 'common.required' | transloco }}
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'clients.dialog.phone' | transloco }}</mat-label>
            <input matInput formControlName="phone" placeholder="+380 50 123 4567" required>
            <mat-error *ngIf="clientForm.get('phone')?.hasError('required')">
              {{ 'common.required' | transloco }}
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'clients.dialog.email' | transloco }}</mat-label>
            <input matInput type="email" formControlName="email" placeholder="ivan@example.com">
            <mat-error *ngIf="clientForm.get('email')?.hasError('email')">
              {{ 'common.invalidEmail' | transloco }}
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'clients.dialog.address' | transloco }}</mat-label>
            <input matInput formControlName="address" placeholder="м. Київ, вул. Хрещатик, 1">
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'clients.dialog.notes' | transloco }}</mat-label>
            <textarea matInput formControlName="notes" rows="3"
              placeholder="{{ 'clients.dialog.notesPlaceholder' | transloco }}"></textarea>
          </mat-form-field>

        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="!px-6 !pb-4 gap-2">
        <button mat-button type="button" (click)="dialogRef.close()">
          {{ 'common.cancel' | transloco }}
        </button>
        <button mat-flat-button color="primary" type="submit" [disabled]="clientForm.invalid">
          {{ 'clients.dialog.submit' | transloco }}
        </button>
      </mat-dialog-actions>

    </form>
  `,
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
