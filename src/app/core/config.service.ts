import { Injectable } from '@angular/core';

/**
 * Single source of truth for all runtime configuration values.
 *
 * NG_APP_* variables are resolved at build time from .env.local.
 * The Groq API key is intentionally absent here — it lives server-side
 * in backend/.env.local and is never sent to the browser.
 *
 * Usage:
 *   const config = inject(ConfigService);
 *   config.aiApiUrl  // → '/api/ai' (proxied to Express backend)
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly env = (import.meta as unknown as { env: Record<string, string> }).env;

  // ─── AI proxy ──────────────────────────────────────────────────────────────
  // In development, Angular's proxyConfig forwards /api/* → http://localhost:4000
  // In production, the Express server is co-hosted or behind the same reverse proxy.
  readonly aiApiUrl = '/api/ai';

  // ─── App ───────────────────────────────────────────────────────────────────
  readonly appName        = 'MotoWorkshop CRM';
  /** Default VAT rate applied to new work orders */
  readonly defaultTaxRate = 0.20;

  // ─── Dev helpers ───────────────────────────────────────────────────────────
  readonly isDev = this.env['NG_APP_ENV'] !== 'production';
}
