import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { OrdersStore } from '../orders.store';
import { ClientsStore } from '../../clients/clients.store';
import { AiService } from '../../ai-assistant/ai.service';
import { DynamicFormService, WorkOrderForm } from '../../ai-assistant/dynamic-form.service';
import { NormHoursService, NormHourEntry } from '../norm-hours.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { UahPipe } from '../../../shared/pipes/uah.pipe';
import { TranslocoModule } from '@jsverse/transloco';

/** Госномер: АА1234ВВ (UA) або іменний (літери/цифри/пробіли, мін 1 символ, макс 20) */
const UA_PLATE_PATTERN = /^[А-ЯҐЄІЇа-яґєії]{2}\d{4}[А-ЯҐЄІЇа-яґєії]{2}$|^[A-Za-zА-ЯҐЄІЇа-яґєії0-9 \-]{1,20}$/;

/** VIN: ровно 17 символов — только если поле заполнено */
const vinIfFilledValidator: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
  const v = (ctrl.value ?? '').trim();
  if (!v) return null;
  return v.length === 17 ? null : { vinLength: true };
};

/** Госномер UA — только если поле заполнено */
const plateIfFilledValidator: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
  const v = (ctrl.value ?? '').trim();
  if (!v) return null;
  return UA_PLATE_PATTERN.test(v) ? null : { plateFormat: true };
};

/** Хотя бы одно из firstName/lastName заполнено */
const atLeastOneNameValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const fg = group as FormGroup;
  const first = fg.get('firstName')?.value?.trim();
  const last  = fg.get('lastName')?.value?.trim();
  return first || last ? null : { atLeastOneName: true };
};

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
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    UahPipe,
    TranslocoModule,
  ],
  templateUrl: './order-edit.html',
  styleUrl: './order-edit.scss',
})
export class OrderEdit implements OnInit {
  readonly store        = inject(OrdersStore);
  readonly clientsStore = inject(ClientsStore);
  readonly aiService    = inject(AiService);
  readonly formService  = inject(DynamicFormService);
  readonly normHours    = inject(NormHoursService);
  readonly #router      = inject(Router);
  readonly #route       = inject(ActivatedRoute);
  readonly #fb          = inject(FormBuilder);
  readonly #destroyRef  = inject(DestroyRef);

  readonly aiPromptInput = signal('');

  // ─── Mode signals ─────────────────────────────────────────────────────────
  readonly clientMode       = signal<'select' | 'manual'>('select');
  readonly motoMode         = signal<'select' | 'manual'>('select');
  readonly selectedClientId = signal<string>('');
  readonly showErrors       = signal(false);

  readonly clientMotorcycles = computed(() => {
    const id = this.selectedClientId();
    if (!id) return [];
    return this.clientsStore.motorcycles().filter(m => m.clientId === id && !m.isArchived);
  });

  // ─── Forms ────────────────────────────────────────────────────────────────
  form!: FormGroup<WorkOrderForm>;

  readonly manualClientForm = this.#fb.group(
    {
      firstName: [''],
      lastName:  [''],
      phone:     [''],
      email:     ['', Validators.email],
    },
    { validators: atLeastOneNameValidator }
  );

  readonly manualMotoForm = this.#fb.group({
    make:         ['', Validators.required],
    model:        ['', Validators.required],
    year:         [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
    vin:          ['', [vinIfFilledValidator]],
    licensePlate: ['', [plateIfFilledValidator]],
  });

  // ─── Form value signals ───────────────────────────────────────────────────
  // #mainFormValues — plain signal, обновляется через подписку в constructor.
  // Это единственный способ сделать главную форму реактивной через computed(),
  // потому что this.form создаётся в ngOnInit (не injection context).
  readonly #mainFormValues = signal<Record<string, unknown>>({});

  // manualClientForm и manualMotoForm создаются как поля — injection context,
  // поэтому для них toSignal() допустим.
  readonly #clientFormValues = toSignal(this.manualClientForm.valueChanges, {
    initialValue: this.manualClientForm.getRawValue(),
  });
  readonly #motoFormValues = toSignal(this.manualMotoForm.valueChanges, {
    initialValue: this.manualMotoForm.getRawValue(),
  });

  // ─── canSave computed ─────────────────────────────────────────────────────
  readonly canSave = computed<boolean>(() => {
    const cMode = this.clientMode();
    const mMode = this.motoMode();
    const main  = this.#mainFormValues();

    // title обязателен
    if (!(main['title'] as string ?? '').trim()) return false;

    // клиент
    if (cMode === 'select') {
      if (!this.selectedClientId()) return false;
    } else {
      const cv = this.#clientFormValues();
      if (!(cv.firstName ?? '').trim() && !(cv.lastName ?? '').trim()) return false;
      if (cv.email && this.manualClientForm.get('email')?.invalid) return false;
    }

    // мотоцикл
    if (mMode === 'select') {
      if (!(main['motorcycleId'] as string ?? '').trim()) return false;
    } else {
      const mv = this.#motoFormValues();
      if (!(mv.make as string ?? '').trim())  return false;
      if (!(mv.model as string ?? '').trim()) return false;
      const vin = (mv.vin as string ?? '').trim();
      if (vin && vin.length !== 17) return false;
    }

    return true;
  });

  // ─── Live totals (computed із #mainFormValues) ────────────────────────────

  // Типізовані зрізи snapshot'у форми — замість any-кастів
  #laborSnapshot(): Array<{ hours: number; ratePerHour: number }> {
    return (this.#mainFormValues()['laborItems'] as Array<{ hours: number; ratePerHour: number }>) ?? [];
  }
  #partsSnapshot(): Array<{ quantity: number; unitPrice: number }> {
    return (this.#mainFormValues()['partsUsed'] as Array<{ quantity: number; unitPrice: number }>) ?? [];
  }

  readonly liveSubtotalLabor = computed(() =>
    this.#laborSnapshot().reduce((s, i) => s + (+(i.hours ?? 0)) * (+(i.ratePerHour ?? 0)), 0)
  );

  readonly liveSubtotalParts = computed(() =>
    this.#partsSnapshot().reduce((s, p) => s + (+(p.quantity ?? 0)) * (+(p.unitPrice ?? 0)), 0)
  );

  readonly liveTotal = computed(() => {
    const tax = +(this.#mainFormValues()['taxRate'] ?? 0.20);
    return (this.liveSubtotalLabor() + this.liveSubtotalParts()) * (1 + tax);
  });

  ngOnInit(): void {
    this.clientsStore.loadAll();

    const q = this.#route.snapshot.queryParams;
    this.form = this.formService.buildWorkOrderForm();

    // Подписываемся на valueChanges главной формы и пишем в signal.
    // takeUntilDestroyed с DestroyRef работает вне constructor тоже.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(v => this.#mainFormValues.set(v as Record<string, unknown>));

    // Инициализируем начальное значение
    this.#mainFormValues.set(this.form.getRawValue() as Record<string, unknown>);

    if (q['clientId']) {
      this.form.get('clientId')?.setValue(q['clientId']);
      this.selectedClientId.set(q['clientId']);
    }
    if (q['motorcycleId']) {
      this.form.get('motorcycleId')?.setValue(q['motorcycleId']);
    }
  }

  // ─── Client mode ──────────────────────────────────────────────────────────

  setClientMode(mode: 'select' | 'manual'): void {
    this.clientMode.set(mode);
    // Сбрасываем клиента и мото при переключении
    this.form.get('clientId')?.setValue('');
    this.selectedClientId.set('');
    this.form.get('motorcycleId')?.setValue('');
    this.motoMode.set('select');
    this.manualClientForm.reset();
    this.manualMotoForm.reset({ year: new Date().getFullYear() });
    this.showErrors.set(false);
  }

  onClientSelect(clientId: string): void {
    this.selectedClientId.set(clientId);
    this.form.get('motorcycleId')?.setValue('');

    const hasBikes = this.clientsStore.motorcycles().some(
      m => m.clientId === clientId && !m.isArchived
    );
    this.motoMode.set(hasBikes ? 'select' : 'manual');
  }

  // ─── Moto mode ────────────────────────────────────────────────────────────

  setMotoMode(mode: 'select' | 'manual'): void {
    this.motoMode.set(mode);
    this.form.get('motorcycleId')?.setValue('');
    this.manualMotoForm.reset({ year: new Date().getFullYear() });
  }

  // ─── Form arrays ──────────────────────────────────────────────────────────

  get laborItems(): FormArray { return this.form.get('laborItems') as FormArray; }
  get partsUsed():  FormArray { return this.form.get('partsUsed')  as FormArray; }

  addLaborItem():              void { this.formService.addLaborItem(this.form); }
  removeLaborItem(i: number):  void { this.formService.removeLaborItem(this.form, i); }
  addPartUsed():               void { this.formService.addPartUsed(this.form); }
  removePartUsed(i: number):   void { this.formService.removePartUsed(this.form, i); }

  // ─── AI draft ─────────────────────────────────────────────────────────────

  async runAiDraft(): Promise<void> {
    const prompt = this.aiPromptInput().trim();
    if (!prompt) return;
    try {
      const draft = await this.aiService.generateWorkOrderDraft(prompt);
      this.formService.patchFormFromDraft(this.form, draft);
    } catch (err) {
      console.error('AI draft error', err);
    }
  }

  // ─── Norm hours autocomplete ──────────────────────────────────────────────

  /**
   * Возвращает норма-часы для текущего мотоцикла.
   * Если мотоцикл выбран из БД — фильтруем по марке/модели.
   * В ручном режиме — по тому, что ввёл пользователь.
   * Плюс всегда добавляем записи с make='*' (общие операции).
   */
  normHoursForBike = computed<NormHourEntry[]>(() => {
    let make  = '';
    let model = '';

    if (this.motoMode() === 'select') {
      const motoId = this.form?.get('motorcycleId')?.value;
      const moto = this.clientsStore.motorcycles().find(m => m.id === motoId);
      make  = moto?.make  ?? '';
      model = moto?.model ?? '';
    } else {
      make  = this.manualMotoForm.get('make')?.value  ?? '';
      model = this.manualMotoForm.get('model')?.value ?? '';
    }

    // Конкретные для марки/модели + общие (*|*)
    const specific = this.normHours.filterEntries(make, model);
    const general  = this.normHours.entries().filter(e => e.make === '*');
    // Дедупликация по операции
    const seen = new Set<string>();
    return [...specific, ...general].filter(e => {
      if (seen.has(e.operation)) return false;
      seen.add(e.operation);
      return true;
    });
  });

  /**
   * Карта: rowIndex → відфільтровані норма-години для цього рядка.
   * Оновлюється реактивно при зміні laborItems або normHoursForBike.
   * Замінює виклик filterNormHours() прямо у @for (O(n²) на кожен цикл).
   */
  readonly normHoursPerRow = computed<Map<number, NormHourEntry[]>>(() => {
    const all = this.normHoursForBike();
    const map = new Map<number, NormHourEntry[]>();
    const values = this.#mainFormValues()['laborItems'] as Array<{ description: string }> ?? [];
    values.forEach((item, idx) => {
      const q = (item.description ?? '').toLowerCase().trim();
      map.set(idx, q ? all.filter(e => e.operation.toLowerCase().includes(q)) : all);
    });
    return map;
  });

  /** @deprecated Use normHoursPerRow signal instead. Kept for compatibility during template migration. */
  filterNormHours(query: string): NormHourEntry[] {
    const q = (query ?? '').toLowerCase().trim();
    if (!q) return this.normHoursForBike();
    return this.normHoursForBike().filter(e => e.operation.toLowerCase().includes(q));
  }

  /**
   * При выборе операции из autocomplete — подставляет описание и норма-часы.
   */
  applyNormHour(entry: NormHourEntry, rowIndex: number): void {
    const row = this.laborItems.at(rowIndex);
    row.get('description')?.setValue(entry.operation);
    row.get('hours')?.setValue(entry.hours);
  }

  // ─── Upload norm hours PDF ────────────────────────────────────────────────

  readonly normHoursFileName = signal<string | null>(null);

  async onNormHoursFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.normHoursFileName.set(file.name);
    await this.normHours.loadFromFile(file);
    // Сбрасываем input чтобы можно было загрузить тот же файл повторно
    input.value = '';
  }

  // ─── Validation → перенесена в computed canSave выше ─────────────────────

  /** Вызывается по клику на кнопку — включает отображение ошибок */
  trySubmit(): void {
    if (!this.canSave()) {
      this.showErrors.set(true);
      this.form.markAllAsTouched();
      this.manualClientForm.markAllAsTouched();
      this.manualMotoForm.markAllAsTouched();
      return;
    }
    this.showErrors.set(false);
    this.onSave();
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async onSave(): Promise<void> {
    if (!this.canSave()) return;
    try {
      // scheduledDate = now при створенні (якщо не вказано вручну)
      if (!this.form.get('scheduledDate')?.value) {
        const today = new Date().toISOString().split('T')[0];
        this.form.get('scheduledDate')?.setValue(today, { emitEvent: false });
      }

      // Для manual-режимів зберігаємо мітку в окремих полях моделі,
      // а clientId/motorcycleId залишаємо порожніми (не document-ref).
      const payload = this.formService.formToOrderPayload(this.form);

      if (this.clientMode() === 'manual') {
        const c = this.manualClientForm.getRawValue();
        payload.clientId          = '';
        payload.manualClientLabel = [c.firstName, c.lastName].filter(Boolean).join(' ');
      }

      if (this.motoMode() === 'manual') {
        const m = this.manualMotoForm.getRawValue();
        payload.motorcycleId    = '';
        payload.manualMotoLabel = `${m.make} ${m.model} ${m.year}${m.licensePlate ? ' · ' + m.licensePlate : ''}`;
      }
      await this.store.create(payload);
      this.#router.navigate(['/orders']);
    } catch (err) {
      console.error('Error saving work order', err);
    }
  }
}
