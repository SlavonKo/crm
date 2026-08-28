import { Injectable } from '@angular/core';

/**
 * Single source of truth for all runtime configuration values.
 *
 * Values are read from environment variables (NG_APP_* prefix) which
 * Angular resolves at build time from .env.local — never hardcoded here.
 *
 * Usage:
 *   const config = inject(ConfigService);
 *   const key = config.groqApiKey;
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly env = (import.meta as unknown as { env: Record<string, string> }).env;

  // ─── Groq / AI ─────────────────────────────────────────────────────────────
  readonly groqApiKey  = this.env['NG_APP_GROQ_API_KEY'] ?? '';
  readonly groqModel   = this.env['NG_APP_GROQ_MODEL']   ?? 'llama-3.3-70b-versatile';
  readonly groqBaseUrl = 'https://api.groq.com/openai/v1';

  // ─── App ───────────────────────────────────────────────────────────────────
  readonly appName     = 'MotoWorkshop CRM';
  /** Default VAT rate applied to new work orders */
  readonly defaultTaxRate = 0.20;

  // ─── Dev helpers ───────────────────────────────────────────────────────────
  readonly isDev = this.env['NG_APP_ENV'] !== 'production';
}
