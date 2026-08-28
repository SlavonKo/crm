export interface InventoryItem {
  id: string;
  name: string;
  /** Stock-keeping unit — unique per item */
  sku: string;
  category: string;
  brand?: string;
  quantity: number;
  /** Alert is triggered when quantity <= minThreshold */
  minThreshold: number;
  unitPrice: number;
  /** Shelf or bin code for physical location */
  location?: string;
  supplierName?: string;
  supplierContact?: string;
  lastRestockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateInventoryItemPayload = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;
