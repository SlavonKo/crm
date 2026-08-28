import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./inventory-list/inventory-list').then(m => m.InventoryList),
  },
];
