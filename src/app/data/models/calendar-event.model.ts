/**
 * CalendarEvent — a scheduled appointment or work order slot on the calendar.
 *
 * Mirrors the structure used by CalendarStore and is the single source of truth
 * for this entity's shape across the entire frontend.
 */
export interface CalendarEvent {
  id: string;
  /** Reference to a linked WorkOrder, if any */
  orderId?: string;
  /** Reference to a linked Client */
  clientId?: string;
  /** Reference to a linked Motorcycle */
  motorcycleId?: string;
  /** Reference to the assigned technician */
  technicianId?: string;
  title: string;
  start: Date;
  end: Date;
  /** Hex or CSS color string used to tint the event chip */
  color?: string;
  notes?: string;
}

/** Display mode for the calendar UI */
export type CalendarViewMode = 'day' | 'week' | 'month';
