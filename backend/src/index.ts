/**
 * MotoWorkshop CRM — AI Proxy Server
 *
 * Lightweight Express server that proxies Groq API calls so the API key
 * never reaches the browser bundle.
 *
 * Routes:
 *   POST /api/ai/work-order-draft
 *   POST /api/ai/receipt-html
 *   POST /api/ai/diagnostic-summary
 *
 * The GROQ_API_KEY env var is read server-side from .env.local (loaded by
 * dev-start.js before this process starts).
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const PORT        = Number(process.env['SERVER_PORT'] ?? 4000);
const GROQ_KEY    = process.env['GROQ_API_KEY'] ?? '';
const GROQ_MODEL  = process.env['GROQ_MODEL']   ?? 'llama-3.3-70b-versatile';
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:4200').split(',');

if (!GROQ_KEY) {
  console.error('[ai-proxy] ✗ GROQ_API_KEY is not set. Add it to .env.local');
  process.exit(1);
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ─── Types ────────────────────────────────────────────────────────────────────

type AiRequestSchema = 'work-order-draft' | 'receipt-html' | 'diagnostic-summary';

interface ProxyRequest {
  schema:     AiRequestSchema;
  userPrompt: string;
  context?:   Record<string, unknown>;
}

interface GroqMessage { role: 'system' | 'user'; content: string; }

// ─── System prompts (mirrored from frontend ai.service.ts) ───────────────────

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

// ─── Groq helper ─────────────────────────────────────────────────────────────

async function callGroq(body: ProxyRequest): Promise<{ data: unknown; rawText: string; tokensUsed: number; modelUsed: string }> {
  const systemPrompt = SYSTEM_PROMPTS[body.schema];
  const contextBlock = body.context
    ? `\n\nContext:\n${JSON.stringify(body.context, null, 2)}`
    : '';

  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: body.userPrompt + contextBlock },
  ];

  const groqBody: Record<string, unknown> = {
    model:       GROQ_MODEL,
    temperature: 0.3,
    messages,
    ...(body.schema === 'work-order-draft'
      ? { response_format: { type: 'json_object' } }
      : {}),
  };

  const res = await axios.post(GROQ_URL, groqBody, {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
  });

  const rawText: string = res.data.choices[0].message.content.trim();
  const data: unknown   = body.schema === 'work-order-draft' ? JSON.parse(rawText) : rawText;

  return {
    data,
    rawText,
    tokensUsed: res.data.usage.total_tokens,
    modelUsed:  res.data.model,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.post('/api/ai/:schema', async (req: Request, res: Response) => {
  const schema = req.params['schema'] as AiRequestSchema;

  if (!SYSTEM_PROMPTS[schema]) {
    res.status(404).json({ error: `Unknown AI schema: ${schema}` });
    return;
  }

  const { userPrompt, context } = req.body as ProxyRequest;

  if (!userPrompt || typeof userPrompt !== 'string') {
    res.status(400).json({ error: 'userPrompt is required and must be a string' });
    return;
  }

  try {
    const result = await callGroq({ schema, userPrompt, context });
    res.json(result);
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status   = axiosErr.response?.status ?? 502;
    const message  = (axiosErr.response?.data as { error?: { message?: string } })?.error?.message
                  ?? axiosErr.message;
    console.error(`[ai-proxy] Groq error (${status}):`, message);
    res.status(status).json({ error: message });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai-proxy' });
});

// ─── 404 / error handlers ─────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ai-proxy] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[ai-proxy] ✓ Listening on http://localhost:${PORT}`);
  console.log(`[ai-proxy]   GROQ_MODEL=${GROQ_MODEL}`);
});
