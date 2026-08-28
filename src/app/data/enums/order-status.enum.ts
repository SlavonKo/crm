export enum OrderStatus {
  DRAFT          = 'draft',
  PENDING        = 'pending',
  IN_PROGRESS    = 'in_progress',
  WAITING_PARTS  = 'waiting_parts',
  COMPLETED      = 'completed',
  INVOICED       = 'invoiced',
  CANCELLED      = 'cancelled',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]:          'Draft',
  [OrderStatus.PENDING]:        'Pending',
  [OrderStatus.IN_PROGRESS]:   'In Progress',
  [OrderStatus.WAITING_PARTS]: 'Waiting for Parts',
  [OrderStatus.COMPLETED]:     'Completed',
  [OrderStatus.INVOICED]:      'Invoiced',
  [OrderStatus.CANCELLED]:     'Cancelled',
};
