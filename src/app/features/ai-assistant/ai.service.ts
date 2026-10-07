import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../core/config.service';
import { WorkOrder } from '../../data/models/work-order.model';
import { Client } from '../../data/models/client.model';
import { AiWorkOrderDraftSchema } from '../../data/schemas/zod.schemas';

// ─── AI Request / Response contracts ─────────────────────────────────────────

export interface AiWorkOrderDraft {
  title: string;
  description: string;
  laborItems: Array<{
    description: string;
    technicianName: string;
    hours: number;
    ratePerHour: number;
  }>;
  partsUsed: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

export type AiRequestSchema =
  | 'work-order-draft'
  | 'receipt-html'
  | 'diagnostic-summary';

export interface AiRequest {
  schema: AiRequestSchema;
  userPrompt: string;
  /** Additional domain context serialised as JSON and injected into the system prompt */
  context?: Record<string, unknown>;
}

export interface AiResponse<T = unknown> {
  data: T;
  rawText: string;
  tokensUsed: number;
  modelUsed: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * AiService — Groq LLM integration for MotoWorkshop CRM.
 *
 * All calls go through the local Express proxy (backend/src/index.ts) so the
 * Groq API key is never included in the browser bundle or network requests.
 *
 * Proxy routes (forwarded by Angular's proxyConfig → http://localhost:4000):
 *   POST /api/ai/work-order-draft
 *   POST /api/ai/receipt-html
 *   POST /api/ai/diagnostic-summary
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  readonly #http   = inject(HttpClient);
  readonly #config = inject(ConfigService);

  readonly isLoading = signal(false);
  readonly lastError = signal<string | null>(null);

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Convert a natural-language user description into a structured WorkOrder draft.
   *
   * @example
   *   const draft = await ai.generateWorkOrderDraft(
   *     'Oil change and rear brake pad replacement, about 2h of work'
   *   );
   */
  async generateWorkOrderDraft(
    userPrompt: string,
    context?: Partial<WorkOrder>
  ): Promise<AiWorkOrderDraft> {
    const raw = await this.#callProxy<AiWorkOrderDraft>({
      schema:  'work-order-draft',
      userPrompt,
      context: context as Record<string, unknown>,
    });

    // Runtime validation — Zod will throw on hallucinated / malformed JSON
    const parsed = AiWorkOrderDraftSchema.parse(raw.data);
    return parsed as AiWorkOrderDraft;
  }

  /**
   * Generate an HTML receipt for a completed / invoiced work order.
   */
  async generateReceiptHtml(order: WorkOrder, client: Client): Promise<string> {
    const response = await this.#callProxy<string>({
      schema:     'receipt-html',
      userPrompt: 'Generate the receipt for the following order.',
      context: {
        order,
        client,
        workshopName: 'MotoWorkshop CRM',
      },
    });
    return response.data;
  }

  /**
   * Summarise diagnostic symptoms into actionable advice.
   */
  async generateDiagnosticSummary(prompt: string): Promise<string> {
    const response = await this.#callProxy<string>({
      schema:     'diagnostic-summary',
      userPrompt: prompt,
    });
    return response.data;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  async #callProxy<T>(request: AiRequest): Promise<AiResponse<T>> {
    this.isLoading.set(true);
    this.lastError.set(null);

    const url = `${this.#config.aiApiUrl}/${request.schema}`;

    try {
      const res = await firstValueFrom(
        this.#http.post<AiResponse<T>>(url, {
          userPrompt: request.userPrompt,
          context:    request.context,
        })
      );
      return res;
    } catch (err) {
      const message = (err as Error).message;
      this.lastError.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }
}
