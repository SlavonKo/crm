import { computed, inject, Injectable, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * Заявка, яку користувач надіслав через Telegram-бота.
 * Структура відповідає відповіді `GET /api/telegram/forms` з бекенду.
 */
export interface TelegramForm {
  userId: number;
  userName: string;
  service: string | null;
  serviceDetails: string | null;
  bikeBrand: string | null;
  phone: string | null;
  submittedAt: string;
}

interface TelegramFormsResponse {
  count: number;
  forms: TelegramForm[];
  timestamp: string;
}

// ─── Store ────────────────────────────────────────────────────────────────

/**
 * TelegramStore — signal-based store для заявок, що надходять через Telegram-бота.
 *
 * Періодично опитує `GET /api/telegram/forms` і надає реактивний стан,
 * який споживається іконкою в тулбарі (видимість + бейдж) та діалогом перегляду.
 */
@Injectable({ providedIn: 'root' })
export class TelegramStore {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  /** Усі заявки, що надійшли через бота і ще не очищені адміном. */
  readonly forms = signal<TelegramForm[]>([]);
  readonly error = signal<string | null>(null);

  /** Кількість активних заявок. */
  readonly count = computed(() => this.forms().length);

  /** Чи є хоч одна заявка — визначає видимість іконки в тулбарі. */
  readonly hasForms = computed(() => this.count() > 0);

  /** Інтервал опитування сервера (мс). */
  private readonly pollIntervalMs = 15_000;

  constructor() {
    this.startPolling();
  }

  /**
   * Запускає періодичний опитувальник.
   * Перший запит виконується одразу (timer(0, ...)), далі — кожні pollIntervalMs.
   * Підписка автоматично скасовується при знищенні root-сервісу.
   */
  startPolling(): void {
    timer(0, this.pollIntervalMs)
      .pipe(
        switchMap(() => this.fetchForms()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private fetchForms() {
    return this.http.get<TelegramFormsResponse>('/api/telegram/forms').pipe(
      tap({
        next: (res) => {
          this.forms.set(res.forms ?? []);
          this.error.set(null);
        },
      }),
      // Тихо ігноруємо помилки — бот/сервер можуть бути недоступні
      // (наприклад, на екрані логіну). Опитувальник продовжує працювати.
      catchError(() => of(null)),
    );
  }

  /**
   * Очищає оброблені заявки на сервері.
   * Викликається з діалогу після того, як адмін опрацював заявки.
   */
  clearProcessed(): void {
    this.http
      .post<{ message: string }>('/api/telegram/forms/clear', {})
      .subscribe({
        next: () => this.forms.set([]),
        error: () => this.error.set('Не вдалося очистити заявки'),
      });
  }
}
