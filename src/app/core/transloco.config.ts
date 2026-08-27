import { Injectable } from '@angular/core';
import { TranslocoLoader, provideTransloco } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class AppTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return fetch(`/assets/i18n/${lang}.json`).then(res => res?.json());
  }
}

export function provideAppTransloco() {
  return provideTransloco({
    config: {
      availableLangs: ['en', 'ru', 'ua'],
      defaultLang: 'en',
      reRenderOnLangChange: true,
      prodMode: false,
      missingHandler: { logMissingKey: true },
    },
    loader: AppTranslocoLoader
  });
}
