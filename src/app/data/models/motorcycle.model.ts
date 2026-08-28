import { MotorcycleType } from '../enums/motorcycle-type.enum';

export type MotorcycleStatus = 'Active' | 'In Workshop' | 'Pending' | 'Archived';

export interface ServiceHistoryEntry {
  /** Reference to the WorkOrder that generated this entry */
  orderId: string;
  date: Date;
  mileageAtService: number;
  description: string;
}

export interface Motorcycle {
  id: string;
  /** Reference to the owning Client document */
  clientId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  type: MotorcycleType;
  color?: string;
  currentMileage: number;
  licensePlate?: string;
  serviceHistory: ServiceHistoryEntry[];
  /** When true the bike is no longer active in the fleet but history is preserved */
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
