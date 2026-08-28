export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  /** Internal workshop notes about the client */
  notes?: string;
  /** References to Motorcycle document IDs in Firestore */
  motorcycleIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Utility: full display name */
export type ClientDisplayName = Pick<Client, 'firstName' | 'lastName'>;
