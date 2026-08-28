import { inject, Injectable, signal, computed } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type SupportedLocale = 'en' | 'uk' | 'pl';

const STORAGE_KEY = 'mw-crm-locale';
const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * I18nService — thin signal-based wrapper around Transloco.
 *
 * Components read `activeLocale` reactively instead of subscribing to
 * Transloco observables directly. Locale is persisted to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly #transloco = inject(TranslocoService);

  readonly activeLocale = signal<SupportedLocale>(this.#resolveInitial());
  readonly isRTL        = computed(() => false); // extend if Arabic etc. is added

  readonly availableLocales: { code: SupportedLocale; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'uk', label: 'Українська' },
    { code: 'pl', label: 'Polski' },
  ];

  setLocale(locale: SupportedLocale): void {
    this.#transloco.setActiveLang(locale);
    this.activeLocale.set(locale);
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }

  #resolveInitial(): SupportedLocale {
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (stored && ['en', 'uk', 'pl'].includes(stored)) return stored;
    // Try to match browser preference
    const browser = navigator.language.slice(0, 2) as SupportedLocale;
    return ['en', 'uk', 'pl'].includes(browser) ? browser : DEFAULT_LOCALE;
  }
}
