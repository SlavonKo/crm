import { Routes } from '@angular/router';

export const calendarRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./calendar-view/calendar-view').then(m => m.CalendarView),
  },
];
