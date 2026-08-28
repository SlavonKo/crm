import { Routes } from '@angular/router';

export const clientsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./clients-list/clients-list').then(m => m.ClientsList),
  },
  {
    path: ':id',
    loadComponent: () => import('./client-detail/client-detail').then(m => m.ClientDetail),
  },
];
