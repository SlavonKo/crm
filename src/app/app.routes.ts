import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // ── Public ──────────────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/auth/unauthorized/unauthorized').then(m => m.Unauthorized),
  },

  // ── Authenticated ────────────────────────────────────────────────────────────
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '',          redirectTo: 'orders', pathMatch: 'full' },
      { path: 'clients',   loadChildren: () => import('./features/clients/clients.routes').then(m => m.clientsRoutes) },
      { path: 'orders',    loadChildren: () => import('./features/orders/orders.routes').then(m => m.ordersRoutes) },
      { path: 'inventory', loadChildren: () => import('./features/inventory/inventory.routes').then(m => m.inventoryRoutes) },
      { path: 'calendar',  loadChildren: () => import('./features/calendar/calendar.routes').then(m => m.calendarRoutes) },
      { path: 'ai',        loadChildren: () => import('./features/ai-assistant/ai-assistant.routes').then(m => m.aiAssistantRoutes) },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────────
  { path: '**', redirectTo: 'orders' },
];
