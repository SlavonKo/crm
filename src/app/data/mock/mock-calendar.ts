import { CalendarEvent } from '../../features/calendar/calendar.store';

const d = (offsetDays: number, hour: number, minute = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
};

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'event-1',
    orderId: 'order-1',
    clientId: 'client-4',
    motorcycleId: 'moto-5',
    title: 'BMW GS — ТО 48000 км + покришки',
    start: d(0, 9),
    end: d(0, 14),
    color: '#0ea5e9',
    notes: 'Клієнт привозить о 9:00. Всі запчастини є.',
  },
  {
    id: 'event-2',
    orderId: 'order-5',
    clientId: 'client-5',
    motorcycleId: 'moto-6',
    title: 'Ducati Monster — чекаємо деталі зчеплення',
    start: d(1, 10),
    end: d(1, 11),
    color: '#f59e0b',
    notes: 'Дзвінок постачальнику щодо дисків зчеплення.',
  },
  {
    id: 'event-3',
    orderId: 'order-6',
    clientId: 'client-3',
    motorcycleId: 'moto-4',
    title: 'Triumph Street Triple — перший ТО',
    start: d(8, 11),
    end: d(8, 13),
    color: '#4f46e5',
    notes: 'Перший ТО після обкатки.',
  },
  {
    id: 'event-4',
    clientId: 'client-1',
    title: 'Yamaha MT-09 — діагностика',
    start: d(3, 14),
    end: d(3, 15, 30),
    color: '#10b981',
    notes: 'Клієнт повідомив про вібрацію на 120+ км/год.',
  },
  {
    id: 'event-5',
    title: 'Замовлення запчастин у MotoDistributor',
    start: d(2, 9),
    end: d(2, 9, 30),
    color: '#f59e0b',
    notes: 'Замовити: Michelin Road 6 R (2 шт.), мастило Motul C2+',
  },
  {
    id: 'event-6',
    clientId: 'client-2',
    motorcycleId: 'moto-3',
    title: 'Honda CB650R — планова перевірка після гальм',
    start: d(5, 10),
    end: d(5, 11),
    color: '#4f46e5',
    notes: 'Контрольна перевірка через 2 тижні після заміни гальм.',
  },
  {
    id: 'event-7',
    clientId: 'client-5',
    motorcycleId: 'moto-7',
    title: 'Ducati Panigale V4 — перший огляд',
    start: d(12, 9),
    end: d(12, 10, 30),
    color: '#4f46e5',
    notes: 'Клієнт новий мотоцикл, хоче перевірити стан.',
  },
];
