import { Component, OnInit, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClientsStore } from '../clients.store';
import { OrdersStore } from '../../orders/orders.store';
import { MotoCardComponent } from '../../../shared/components/moto-card/moto-card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Motorcycle, MotorcycleStatus } from '../../../data/models/motorcycle.model';
import { MotorcycleType, MOTORCYCLE_TYPE_LABELS } from '../../../data/enums/motorcycle-type.enum';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MotoCardComponent,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    TranslocoModule,
  ],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
})
export class ClientDetail implements OnInit {
  readonly store       = inject(ClientsStore);
  readonly ordersStore = inject(OrdersStore);
  readonly #dialog      = inject(MatDialog);
  readonly #router      = inject(Router);

  readonly id = input.required<string>();

  constructor() {
    effect(() => {
      const clientId = this.id();
      this.store.select(clientId);
      this.store.loadOne(clientId);
    });
  }

  ngOnInit(): void {
    this.ordersStore.loadAll();
  }

  getMotorcycleStatus(moto: Motorcycle): MotorcycleStatus {
    if (moto.isArchived) return 'Archived';
    const activeOrder = this.ordersStore.orders().find(o =>
      o.motorcycleId === moto.id &&
      (o.status === 'in_progress' || o.status === 'pending' || o.status === 'waiting_parts')
    );
    return activeOrder ? 'In Workshop' : 'Active';
  }

  // ─── Add motorcycle ───────────────────────────────────────────────────────

  openAddMotoDialog(): void {
    const ref = this.#dialog.open(AddMotorcycleDialogComponent, {
      width: '520px',
      autoFocus: 'first-tab',
    });

    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.store.addMotorcycle({ ...result, clientId: this.id() });
      }
    });
  }

  // ─── Edit motorcycle ──────────────────────────────────────────────────────

  onEditInfo(moto: Motorcycle): void {
    const ref = this.#dialog.open(EditMotorcycleDialogComponent, {
      width: '520px',
      autoFocus: 'first-tab',
      data: moto,
    });

    ref.afterClosed().subscribe(async (patch: Partial<Motorcycle> | undefined) => {
      if (patch) {
        await this.store.updateMotorcycle(moto.id, patch);
      }
    });
  }

  // ─── Other actions ────────────────────────────────────────────────────────

  async onArchiveMoto(moto: Motorcycle): Promise<void> {
    if (confirm(`Архівувати ${moto.make} ${moto.model}?`)) {
      await this.store.archiveMotorcycle(moto.id);
    }
  }

  onNewOrder(moto: Motorcycle): void {
    this.#router.navigate(['/orders/new'], {
      queryParams: { clientId: this.id(), motorcycleId: moto.id },
    });
  }
}

// ─── Shared type options ─────────────────────────────────────────────────────

const TYPE_OPTIONS = Object.entries(MOTORCYCLE_TYPE_LABELS).map(([k, v]) => ({
  value: k as MotorcycleType,
  label: v,
}));

// ─── Add Motorcycle Dialog ────────────────────────────────────────────────────

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
  template: `
    <h2 mat-dialog-title class="!text-xl !font-bold">{{ 'clients.addMotoDialog.title' | transloco }}</h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="flex flex-col gap-4 !pt-2 !overflow-visible">

        <mat-form-field appearance="outline">
          <mat-label>VIN</mat-label>
          <input matInput formControlName="vin" placeholder="17 символів" required>
          <mat-error *ngIf="form.get('vin')?.hasError('required')">{{ 'common.required' | transloco }}</mat-error>
          <mat-error *ngIf="form.get('vin')?.hasError('minlength') || form.get('vin')?.hasError('maxlength')">
            Рівно 17 символів
          </mat-error>
        </mat-form-field>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.make' | transloco }}</mat-label>
            <input matInput formControlName="make" placeholder="Yamaha" required>
            <mat-error *ngIf="form.get('make')?.hasError('required')">{{ 'common.required' | transloco }}</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.model' | transloco }}</mat-label>
            <input matInput formControlName="model" placeholder="MT-09" required>
            <mat-error *ngIf="form.get('model')?.hasError('required')">{{ 'common.required' | transloco }}</mat-error>
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.year' | transloco }}</mat-label>
            <input matInput type="number" formControlName="year" placeholder="2023" required>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.mileage' | transloco }}</mat-label>
            <input matInput type="number" formControlName="currentMileage" placeholder="12500" required>
            <mat-hint>км</mat-hint>
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.type' | transloco }}</mat-label>
            <mat-select formControlName="type" required>
              <mat-option *ngFor="let t of typeOptions" [value]="t.value">{{ t.label }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.plate' | transloco }}</mat-label>
            <input matInput formControlName="licensePlate" placeholder="АА1234ВВ">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'clients.addMotoDialog.color' | transloco }}</mat-label>
          <input matInput formControlName="color" placeholder="Чорний / Синій">
        </mat-form-field>

      </mat-dialog-content>
      <mat-dialog-actions align="end" class="!pb-4 !px-6 gap-2">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ 'clients.addMotoDialog.submit' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
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

// ─── Edit Motorcycle Dialog ───────────────────────────────────────────────────

import { MAT_DIALOG_DATA } from '@angular/material/dialog';

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
  template: `
    <h2 mat-dialog-title class="!text-xl !font-bold">
      {{ 'clients.editMotoDialog.title' | transloco }}
      <span class="text-slate-400 font-normal text-base ml-2">{{ data.make }} {{ data.model }}</span>
    </h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="flex flex-col gap-4 !pt-2 !overflow-visible">

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.make' | transloco }}</mat-label>
            <input matInput formControlName="make" required>
            <mat-error *ngIf="form.get('make')?.hasError('required')">{{ 'common.required' | transloco }}</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.model' | transloco }}</mat-label>
            <input matInput formControlName="model" required>
            <mat-error *ngIf="form.get('model')?.hasError('required')">{{ 'common.required' | transloco }}</mat-error>
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.year' | transloco }}</mat-label>
            <input matInput type="number" formControlName="year" required>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.mileage' | transloco }}</mat-label>
            <input matInput type="number" formControlName="currentMileage" required>
            <mat-hint>км</mat-hint>
          </mat-form-field>
        </div>

        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.type' | transloco }}</mat-label>
            <mat-select formControlName="type" required>
              <mat-option *ngFor="let t of typeOptions" [value]="t.value">{{ t.label }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'clients.addMotoDialog.plate' | transloco }}</mat-label>
            <input matInput formControlName="licensePlate">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>VIN</mat-label>
          <input matInput formControlName="vin" required>
          <mat-error *ngIf="form.get('vin')?.hasError('required')">{{ 'common.required' | transloco }}</mat-error>
          <mat-error *ngIf="form.get('vin')?.hasError('minlength') || form.get('vin')?.hasError('maxlength')">
            Рівно 17 символів
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'clients.addMotoDialog.color' | transloco }}</mat-label>
          <input matInput formControlName="color">
        </mat-form-field>

      </mat-dialog-content>
      <mat-dialog-actions align="end" class="!pb-4 !px-6 gap-2">
        <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | transloco }}</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ 'clients.editMotoDialog.submit' | transloco }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
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
