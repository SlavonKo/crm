import { Routes } from '@angular/router';

export const ordersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./orders-list/orders-list').then(m => m.OrdersList),
  },
  {
    path: 'new',
    loadComponent: () => import('./order-edit/order-edit').then(m => m.OrderEdit),
  },
  {
    path: ':id',
    loadComponent: () => import('./order-detail/order-detail').then(m => m.OrderDetail),
  },
];
