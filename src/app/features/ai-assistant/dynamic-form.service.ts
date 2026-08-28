import { Injectable } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { AiWorkOrderDraft } from './ai.service';
import { WorkOrder, CreateWorkOrderPayload, LaborItem, PartUsed } from '../../data/models/work-order.model';
import { OrderStatus } from '../../data/enums/order-status.enum';
import { ConfigService } from '../../core/config.service';
import { inject } from '@angular/core';

// ─── Typed form group shapes ──────────────────────────────────────────────────

export interface LaborItemForm {
  description:    FormControl<string>;
  technicianName: FormControl<string>;
  hours:          FormControl<number>;
  ratePerHour:    FormControl<number>;
}

export interface PartUsedForm {
  inventoryItemId: FormControl<string>;
  sku:             FormControl<string>;
  name:            FormControl<string>;
  quantity:        FormControl<number>;
  unitPrice:       FormControl<number>;
}

export interface WorkOrderForm {
  clientId:     FormControl<string>;
  motorcycleId: FormControl<string>;
  title:        FormControl<string>;
  description:  FormControl<string>;
  status:       FormControl<OrderStatus>;
  taxRate:      FormControl<number>;
  laborItems:   FormArray<FormGroup<LaborItemForm>>;
  partsUsed:    FormArray<FormGroup<PartUsedForm>>;
  scheduledDate: FormControl<Date | null>;
}

/**
 * DynamicFormService — bridges AI-generated drafts and Angular Reactive Forms.
 *
 * Responsibilities:
 * 1. Build a fully typed FormGroup for work order creation.
 * 2. Patch an existing form from an AI draft (preserves manual user edits).
 * 3. Serialize the completed form back to a CreateWorkOrderPayload.
 */
@Injectable({ providedIn: 'root' })
export class DynamicFormService {
  readonly #config = inject(ConfigService);

  // ─── Form builders ────────────────────────────────────────────────────────

  buildWorkOrderForm(draft?: Partial<AiWorkOrderDraft>): FormGroup<WorkOrderForm> {
    const form = new FormGroup<WorkOrderForm>({
      clientId:     new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      motorcycleId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      title:        new FormControl(draft?.title ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
      description:  new FormControl(draft?.description ?? '', { nonNullable: true }),
      status:       new FormControl<OrderStatus>(OrderStatus.DRAFT, { nonNullable: true }),
      taxRate:      new FormControl(this.#config.defaultTaxRate, { nonNullable: true, validators: [Validators.min(0), Validators.max(1)] }),
      scheduledDate: new FormControl<Date | null>(null),
      laborItems:   new FormArray<FormGroup<LaborItemForm>>(
        (draft?.laborItems ?? []).map(l => this.#buildLaborItemGroup(l))
      ),
      partsUsed:    new FormArray<FormGroup<PartUsedForm>>(
        (draft?.partsUsed ?? []).map(p => this.#buildPartUsedGroup(p))
      ),
    });

    return form;
  }

  addLaborItem(form: FormGroup<WorkOrderForm>): void {
    form.controls.laborItems.push(this.#buildLaborItemGroup());
  }

  removeLaborItem(form: FormGroup<WorkOrderForm>, index: number): void {
    form.controls.laborItems.removeAt(index);
  }

  addPartUsed(form: FormGroup<WorkOrderForm>): void {
    form.controls.partsUsed.push(this.#buildPartUsedGroup());
  }

  removePartUsed(form: FormGroup<WorkOrderForm>, index: number): void {
    form.controls.partsUsed.removeAt(index);
  }

  // ─── AI Patch ─────────────────────────────────────────────────────────────

  /**
   * Merges an AI draft into an existing form without losing user edits.
   * Only overwrites empty or default fields.
   */
  patchFormFromDraft(form: FormGroup<WorkOrderForm>, draft: AiWorkOrderDraft): void {
    if (!form.controls.title.value) {
      form.controls.title.setValue(draft.title);
    }
    if (!form.controls.description.value) {
      form.controls.description.setValue(draft.description);
    }

    // Replace labor items if the array is empty (AI-initiated flow)
    if (form.controls.laborItems.length === 0) {
      draft.laborItems.forEach(l =>
        form.controls.laborItems.push(this.#buildLaborItemGroup(l))
      );
    }

    // Replace parts if the array is empty
    if (form.controls.partsUsed.length === 0) {
      draft.partsUsed.forEach(p =>
        form.controls.partsUsed.push(this.#buildPartUsedGroup(p))
      );
    }
  }

  // ─── Serializer ───────────────────────────────────────────────────────────

  /**
   * Convert a valid FormGroup value to a CreateWorkOrderPayload.
   * Calculates all totals so the caller never needs to.
   */
  formToOrderPayload(form: FormGroup<WorkOrderForm>): CreateWorkOrderPayload {
    const v = form.getRawValue();

    const laborItems: LaborItem[] = v.laborItems.map(l => ({
      ...l,
      total: l.hours * l.ratePerHour,
    }));

    const partsUsed: PartUsed[] = v.partsUsed.map(p => ({
      ...p,
      total: p.quantity * p.unitPrice,
    }));

    const subtotalLabor = laborItems.reduce((s, l) => s + l.total, 0);
    const subtotalParts = partsUsed.reduce((s, p) => s + p.total, 0);
    const totalCost     = (subtotalLabor + subtotalParts) * (1 + v.taxRate);

    return {
      clientId:     v.clientId,
      motorcycleId: v.motorcycleId,
      title:        v.title,
      description:  v.description,
      status:       v.status,
      taxRate:      v.taxRate,
      scheduledDate: v.scheduledDate ?? undefined,
      laborItems,
      partsUsed,
      subtotalLabor,
      subtotalParts,
      totalCost,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  #buildLaborItemGroup(defaults?: Partial<AiWorkOrderDraft['laborItems'][0]>): FormGroup<LaborItemForm> {
    return new FormGroup<LaborItemForm>({
      description:    new FormControl(defaults?.description    ?? '', { nonNullable: true, validators: [Validators.required] }),
      technicianName: new FormControl(defaults?.technicianName ?? 'TBD', { nonNullable: true }),
      hours:          new FormControl(defaults?.hours          ?? 1, { nonNullable: true, validators: [Validators.required, Validators.min(0.5)] }),
      ratePerHour:    new FormControl(defaults?.ratePerHour    ?? 0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    });
  }

  #buildPartUsedGroup(defaults?: Partial<AiWorkOrderDraft['partsUsed'][0]>): FormGroup<PartUsedForm> {
    return new FormGroup<PartUsedForm>({
      inventoryItemId: new FormControl(defaults?.sku ?? '', { nonNullable: true }),
      sku:             new FormControl(defaults?.sku  ?? '', { nonNullable: true }),
      name:            new FormControl(defaults?.name ?? '', { nonNullable: true, validators: [Validators.required] }),
      quantity:        new FormControl(defaults?.quantity  ?? 1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
      unitPrice:       new FormControl(defaults?.unitPrice ?? 0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    });
  }
}
