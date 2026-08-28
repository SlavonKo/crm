import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OrdersStore } from '../orders.store';
import { ClientsStore } from '../../clients/clients.store';
import { AiService } from '../../ai-assistant/ai.service';
import { DynamicFormService, WorkOrderForm } from '../../ai-assistant/dynamic-form.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { UahPipe } from '../../../shared/pipes/uah.pipe';

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    UahPipe,
  ],
  templateUrl: './order-edit.html',
  styleUrl: './order-edit.scss',
})
export class OrderEdit implements OnInit {
  readonly store        = inject(OrdersStore);
  readonly clientsStore = inject(ClientsStore);
  readonly aiService     = inject(AiService);
  readonly formService   = inject(DynamicFormService);
  readonly #router       = inject(Router);
  readonly #route        = inject(ActivatedRoute);

  // Writable signal for the natural language prompt input
  readonly aiPromptInput = signal('');

  // Form Group reference
  form!: FormGroup<WorkOrderForm>;

  // Filtered motorcycles list for select dropdown
  readonly clientMotorcycles = computed(() => {
    if (!this.form) return [];
    const clientId = this.form.get('clientId')?.value;
    if (!clientId) return [];
    return this.clientsStore.motorcycles().filter(m => m.clientId === clientId && !m.isArchived);
  });

  ngOnInit(): void {
    this.clientsStore.loadAll();
    
    // Check query parameters to pre-fill client & motorcycle IDs
    const qParams = this.#route.snapshot.queryParams;
    const clientId = qParams['clientId'] || '';
    const motorcycleId = qParams['motorcycleId'] || '';

    // Build default empty form structure
    this.form = this.formService.buildWorkOrderForm();

    if (clientId) {
      this.form.get('clientId')?.setValue(clientId);
    }
    if (motorcycleId) {
      this.form.get('motorcycleId')?.setValue(motorcycleId);
    }
  }

  onClientSelect(): void {
    // Reset selected motorcycle when client changes
    this.form.get('motorcycleId')?.setValue('');
  }

  async runAiDraft(): Promise<void> {
    const prompt = this.aiPromptInput().trim();
    if (!prompt) return;

    try {
      const draft = await this.aiService.generateWorkOrderDraft(prompt);
      this.formService.patchFormFromDraft(this.form, draft);
    } catch (err) {
      console.error('Error generating AI work order draft', err);
    }
  }

  get laborItems(): FormArray {
    return this.form.get('laborItems') as FormArray;
  }

  get partsUsed(): FormArray {
    return this.form.get('partsUsed') as FormArray;
  }

  addLaborItem(): void {
    this.formService.addLaborItem(this.form);
  }

  removeLaborItem(index: number): void {
    this.formService.removeLaborItem(this.form, index);
  }

  addPartUsed(): void {
    this.formService.addPartUsed(this.form);
  }

  removePartUsed(index: number): void {
    this.formService.removePartUsed(this.form, index);
  }

  // Calculate live values from the reactive form values
  readonly liveSubtotalLabor = computed(() => {
    if (!this.form) return 0;
    const items = this.form.getRawValue().laborItems || [];
    return items.reduce((s, i) => s + (i.hours * i.ratePerHour), 0);
  });

  readonly liveSubtotalParts = computed(() => {
    if (!this.form) return 0;
    const parts = this.form.getRawValue().partsUsed || [];
    return parts.reduce((s, p) => s + (p.quantity * p.unitPrice), 0);
  });

  readonly liveTotal = computed(() => {
    if (!this.form) return 0;
    const taxRate = this.form.get('taxRate')?.value ?? 0.20;
    return (this.liveSubtotalLabor() + this.liveSubtotalParts()) * (1 + taxRate);
  });

  async onSave(): Promise<void> {
    if (this.form.invalid) return;

    try {
      const payload = this.formService.formToOrderPayload(this.form);
      const newId = await this.store.create(payload);
      
      // Navigate back to orders list
      this.#router.navigate(['/orders']);
    } catch (err) {
      console.error('Error saving work order', err);
    }
  }
}
