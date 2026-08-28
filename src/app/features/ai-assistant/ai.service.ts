import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

// ─── Groq Chat API shapes ─────────────────────────────────────────────────────

interface GroqMessage { role: 'system' | 'user' | 'assistant'; content: string; }
interface GroqChatRequest { model: string; messages: GroqMessage[]; temperature: number; response_format?: { type: 'json_object' }; }
interface GroqChatResponse { choices: [{ message: { content: string } }]; usage: { total_tokens: number }; model: string; }

// ─── System prompts ───────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<AiRequestSchema, string> = {
  'work-order-draft': `
You are an expert moto-workshop assistant. The user will describe repair work in natural language.
Your task is to return a valid JSON object that matches this TypeScript interface exactly:

interface AiWorkOrderDraft {
  title: string;            // short, max 80 chars
  description: string;      // detailed description of all work
  laborItems: Array<{
    description: string;
    technicianName: string; // use "TBD" if not mentioned
    hours: number;          // positive float
    ratePerHour: number;    // positive float, estimate if unknown
  }>;
  partsUsed: Array<{
    sku: string;            // empty string if unknown
    name: string;
    quantity: number;       // positive integer
    unitPrice: number;      // estimate if unknown
  }>;
  notes?: string;
}

Return ONLY the JSON object, no markdown, no explanation.`,

  'receipt-html': `
You are a professional billing assistant for a moto workshop.
Generate a clean, print-ready HTML receipt based on the order data provided.
Return only the HTML fragment (not a full page), starting with a <div>.`,

  'diagnostic-summary': `
You are a moto-workshop diagnostic assistant.
The user will describe symptoms or issues. Summarize possible causes and recommended actions
in plain text (max 200 words). Return only the summary text.`,
};

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * AiService — Groq LLM integration for MotoWorkshop CRM.
 *
 * Handles all communication with the Groq Chat Completions API.
 * All AI responses are validated against Zod schemas before being returned.
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
    const raw = await this.#callGroq<AiWorkOrderDraft>({
      schema:     'work-order-draft',
      userPrompt,
      context:    context as Record<string, unknown>,
    });

    // Runtime validation — Zod will throw on hallucinated / malformed JSON
    const parsed = AiWorkOrderDraftSchema.parse(raw.data);
    return parsed as AiWorkOrderDraft;
  }

  /**
   * Generate an HTML receipt for a completed / invoiced work order.
   */
  async generateReceiptHtml(order: WorkOrder, client: Client): Promise<string> {
    const response = await this.#callGroq<string>({
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
    const response = await this.#callGroq<string>({
      schema:     'diagnostic-summary',
      userPrompt: prompt,
    });
    return response.data;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  async #callGroq<T>(request: AiRequest): Promise<AiResponse<T>> {
    this.isLoading.set(true);
    this.lastError.set(null);

    const systemPrompt = SYSTEM_PROMPTS[request.schema];
    const contextBlock = request.context
      ? `\n\nContext:\n${JSON.stringify(request.context, null, 2)}`
      : '';

    const body: GroqChatRequest = {
      model:       this.#config.groqModel,
      temperature: 0.3,
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: request.userPrompt + contextBlock },
      ],
      // Ask for JSON only when the schema requires it
      ...(request.schema === 'work-order-draft'
        ? { response_format: { type: 'json_object' } }
        : {}),
    };

    const headers = new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${this.#config.groqApiKey}`,
    });

    try {
      const res = await firstValueFrom(
        this.#http.post<GroqChatResponse>(
          `${this.#config.groqBaseUrl}/chat/completions`,
          body,
          { headers }
        )
      );

      const rawText = res.choices[0].message.content.trim();
      let data: T;

      if (request.schema === 'work-order-draft') {
        data = JSON.parse(rawText) as T;
      } else {
        data = rawText as unknown as T;
      }

      return {
        data,
        rawText,
        tokensUsed: res.usage.total_tokens,
        modelUsed:  res.model,
      };
    } catch (err) {
      const message = (err as Error).message;
      this.lastError.set(message);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }
}
