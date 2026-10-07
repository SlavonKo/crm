/**
 * Zod runtime schemas for all domain models.
 *
 * Primary use-case: validating AI (Groq) JSON responses at the application
 * boundary before they are trusted and stored in Firestore.
 *
 * NOTE: zod must be added to dependencies:
 *   npm install zod
 */
import { z } from 'zod';
import { OrderStatus } from '../enums/order-status.enum';
import { MotorcycleType } from '../enums/motorcycle-type.enum';
import { UserRole } from '../enums/user-role.enum';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const OrderStatusSchema     = z.nativeEnum(OrderStatus);
export const MotorcycleTypeSchema  = z.nativeEnum(MotorcycleType);
export const UserRoleSchema        = z.nativeEnum(UserRole);

// ─── Labor & Parts ───────────────────────────────────────────────────────────

export const LaborItemSchema = z.object({
  description:    z.string().min(1),
  technicianName: z.string().min(1),
  hours:          z.number().positive(),
  ratePerHour:    z.number().nonnegative(),
  total:          z.number().nonnegative(),
});

export const PartUsedSchema = z.object({
  inventoryItemId: z.string().min(1),
  sku:             z.string().min(1),
  name:            z.string().min(1),
  quantity:        z.number().int().positive(),
  unitPrice:       z.number().nonnegative(),
  total:           z.number().nonnegative(),
});

// ─── AI-specific schemas (subset, used for Groq response validation) ─────────

/**
 * The schema the AI must follow when generating a work-order draft.
 * Intentionally permissive (no `total` required — the app calculates it).
 */
export const AiWorkOrderDraftSchema = z.object({
  title:       z.string().min(1),
  description: z.string(),
  laborItems: z.array(z.object({
    description:    z.string(),
    technicianName: z.string().default('TBD'),
    hours:          z.number().positive(),
    ratePerHour:    z.number().nonnegative(),
  })),
  partsUsed: z.array(z.object({
    sku:       z.string(),
    name:      z.string(),
    quantity:  z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
  })),
  notes: z.string().optional(),
});

export type AiWorkOrderDraftSchema = z.infer<typeof AiWorkOrderDraftSchema>;

// ─── Full domain schemas (used for API response validation) ──────────────────

export const ClientSchema = z.object({
  id:            z.string(),
  firstName:     z.string().min(1),
  lastName:      z.string().min(1),
  phone:         z.string().min(7),
  email:         z.string().email().optional(),
  address:       z.string().optional(),
  notes:         z.string().optional(),
  motorcycleIds: z.array(z.string()),
  createdAt:     z.coerce.date(),
  updatedAt:     z.coerce.date(),
});

export const ServiceHistoryEntrySchema = z.object({
  orderId:          z.string(),
  date:             z.coerce.date(),
  mileageAtService: z.number().nonnegative(),
  description:      z.string(),
});

export const MotorcycleSchema = z.object({
  id:             z.string(),
  clientId:       z.string(),
  vin:            z.string().min(17).max(17),
  make:           z.string().min(1),
  model:          z.string().min(1),
  year:           z.number().int().min(1900).max(new Date().getFullYear() + 1),
  type:           MotorcycleTypeSchema,
  color:          z.string().optional(),
  currentMileage: z.number().nonnegative(),
  licensePlate:   z.string().optional(),
  serviceHistory: z.array(ServiceHistoryEntrySchema),
  isArchived:     z.boolean(),
  archivedAt:     z.coerce.date().optional(),
  createdAt:      z.coerce.date(),
  updatedAt:      z.coerce.date(),
});

export const WorkOrderSchema = z.object({
  id:                     z.string(),
  clientId:               z.string(),
  motorcycleId:           z.string(),
  status:                 OrderStatusSchema,
  title:                  z.string().min(1),
  description:            z.string(),
  partsUsed:              z.array(PartUsedSchema),
  laborItems:             z.array(LaborItemSchema),
  subtotalParts:          z.number().nonnegative(),
  subtotalLabor:          z.number().nonnegative(),
  taxRate:                z.number().min(0).max(1),
  totalCost:              z.number().nonnegative(),
  aiGeneratedReceiptHtml: z.string().optional(),
  aiPromptUsed:           z.string().optional(),
  assignedTechnicianId:   z.string().optional(),
  scheduledDate:          z.coerce.date().optional(),
  startedAt:              z.coerce.date().optional(),
  estimatedCompletionDate: z.coerce.date().optional(),
  completedAt:            z.coerce.date().optional(),
  createdAt:              z.coerce.date(),
  updatedAt:              z.coerce.date(),
});

export const InventoryItemSchema = z.object({
  id:              z.string(),
  name:            z.string().min(1),
  sku:             z.string().min(1),
  category:        z.string().min(1),
  brand:           z.string().optional(),
  quantity:        z.number().int().nonnegative(),
  minThreshold:    z.number().int().nonnegative(),
  unitPrice:       z.number().nonnegative(),
  location:        z.string().optional(),
  supplierName:    z.string().optional(),
  supplierContact: z.string().optional(),
  lastRestockedAt: z.coerce.date().optional(),
  createdAt:       z.coerce.date(),
  updatedAt:       z.coerce.date(),
});
