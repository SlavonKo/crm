import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TelegramStore } from '../../telegram/telegram.store';

@Component({
  selector: 'app-telegram-forms-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './telegram-forms-dialog.html',
  styleUrl: './telegram-forms-dialog.scss',
})
export class TelegramFormsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<TelegramFormsDialogComponent>);
  readonly telegramStore = inject(TelegramStore);

  close(): void {
    this.dialogRef.close();
  }

  /** Очищає всі оброблені заявки на сервері та закриває діалог. */
  clearAll(): void {
    this.telegramStore.clearProcessed();
    this.dialogRef.close();
  }
}
