import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAppTransloco } from './transloco.config';
import { routes } from '../app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // ── Zoneless Angular 22 ──────────────────────────────────────────────────
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    // ── Routing ──────────────────────────────────────────────────────────────
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
    ),

    // ── HTTP (used by AiService for Groq calls) ───────────────────────────────
    provideHttpClient(withFetch()),

    // ── UI & i18n ─────────────────────────────────────────────────────────────
    provideAnimationsAsync(),
    provideAppTransloco(),

    // TODO: Firebase — раскомментировать когда будем строить бэкенд
    // provideFirebaseApp(() => initializeApp(firebaseConfig)),
    // provideAuth(() => getAuth()),
    // provideFirestore(() => getFirestore()),
  ],
};
