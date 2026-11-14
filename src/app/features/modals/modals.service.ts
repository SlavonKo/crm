import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ClientsStore } from '../clients/clients.store';
import { Motorcycle } from '../../data/models/motorcycle.model';
import { UpcomingDatesDialogComponent } from './upcoming-dates-dialog/upcoming-dates-dialog';
import { AddClientDialogComponent } from './add-client-dialog/add-client-dialog';
import { AddMotorcycleDialogComponent } from './add-motorcycle-dialog/add-motorcycle-dialog';
import { EditMotorcycleDialogComponent } from './edit-motorcycle-dialog/edit-motorcycle-dialog';
import { EditClientDialogComponent } from './edit-client-dialog/edit-client-dialog';
import { AddInventoryItemDialogComponent } from './add-inventory-item-dialog/add-inventory-item-dialog';
import { AddEventDialogComponent } from './add-event-dialog/add-event-dialog';
import { TelegramQrDialogComponent } from './telegram-qr-dialog/telegram-qr-dialog';

@Injectable({
  providedIn: 'root',
})
export class ModalsService {
  readonly #dialog = inject(MatDialog);
  readonly #router = inject(Router);
  readonly #clientsStore = inject(ClientsStore);

  /**
   * Opens the upcoming dates dialog
   */
  openUpcomingDates(): void {
    this.#dialog.open(UpcomingDatesDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: false,
    });
  }

  /**
   * Opens the add client dialog
   * @returns Promise that resolves with the dialog result
   */
  openAddClient(): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.#dialog.open(AddClientDialogComponent, {
        width: '500px',
        autoFocus: 'first-tab',
        disableClose: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  /**
   * Opens the add motorcycle dialog
   * @returns Promise that resolves with the dialog result
   */
  openAddMotorcycle(): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.#dialog.open(AddMotorcycleDialogComponent, {
        width: '520px',
        autoFocus: 'first-tab',
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  /**
   * Opens the edit motorcycle dialog
   * @param motorcycle The motorcycle data to edit
   * @returns Promise that resolves with the dialog result
   */
  openEditMotorcycle(motorcycle: Motorcycle): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.#dialog.open(EditMotorcycleDialogComponent, {
        width: '520px',
        autoFocus: 'first-tab',
        data: motorcycle,
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  /**
   * Opens the edit client dialog
   * @param client The client data to edit
   * @returns Promise that resolves with the dialog result
   */
  openEditClient(client: any): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.#dialog.open(EditClientDialogComponent, {
        width: '520px',
        autoFocus: 'first-tab',
        data: client,
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  /**
   * Opens the add inventory item dialog
   * @returns Promise that resolves with the dialog result
   */
  openAddInventoryItem(): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.#dialog.open(AddInventoryItemDialogComponent, {
        width: '500px',
        autoFocus: 'first-tab',
        disableClose: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  /**
   * Opens the add event dialog
   * @returns Promise that resolves with the dialog result
   */
  openAddEvent(): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.#dialog.open(AddEventDialogComponent, {
        width: '500px',
        autoFocus: 'first-tab',
        disableClose: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  /**
   * Opens the Telegram QR code dialog
   */
  openTelegramQr(): void {
    this.#dialog.open(TelegramQrDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      disableClose: false,
    });
  }
}
