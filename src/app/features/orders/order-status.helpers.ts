/**
 * Shared helpers for order status display.
 * Used by OrdersList, OrderDetail — avoids duplication of getBadgeClass / getStatusLabel.
 */
import { OrderStatus, ORDER_STATUS_LABELS } from '../../data/enums/order-status.enum';

/** Tailwind badge classes per status */
export function getOrderBadgeClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.DRAFT:         return 'bg-slate-100 text-slate-700';
    case OrderStatus.PENDING:       return 'bg-amber-100 text-amber-700';
    case OrderStatus.IN_PROGRESS:   return 'bg-sky-100 text-sky-700';
    case OrderStatus.WAITING_PARTS: return 'bg-orange-100 text-orange-700';
    case OrderStatus.COMPLETED:     return 'bg-green-150 text-green-700';
    case OrderStatus.INVOICED:      return 'bg-indigo-100 text-indigo-700';
    case OrderStatus.CANCELLED:     return 'bg-rose-100 text-rose-700';
    default:                        return 'bg-slate-100 text-slate-700';
  }
}

/** Human-readable label for a status value */
export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

/** Options for a status filter dropdown — includes an "All" entry at the top */
export const ORDER_STATUS_FILTER_OPTIONS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => ({
    value: k as OrderStatus,
    label: v,
  })),
];

/** Options for a status change menu — no "All" entry */
export const ORDER_STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = Object.entries(
  ORDER_STATUS_LABELS
).map(([k, v]) => ({ value: k as OrderStatus, label: v }));
