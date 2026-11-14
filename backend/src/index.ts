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
import { initTelegramBot, stopTelegramBot, getTelegramBot } from './telegram-bot.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const PORT        = Number(process.env['SERVER_PORT'] ?? 4000);
const GROQ_KEY    = process.env['GROQ_API_KEY'] ?? '';
const GROQ_MODEL  = process.env['GROQ_MODEL']   ?? 'openai/gpt-oss-120b';
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:4200').split(',');
const TELEGRAM_TOKEN = process.env['TELEGRAM_BOT_TOKEN'] ?? '';

if (!GROQ_KEY) {
  console.error('[ai-proxy] ✗ GROQ_API_KEY is not set. Add it to .env.local');
  process.exit(1);
}

if (!TELEGRAM_TOKEN) {
  console.warn('[telegram-bot] ⚠ TELEGRAM_BOT_TOKEN is not set. Telegram bot will not be initialized.');
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

// Telegram QR code endpoint with caching
app.get('/api/telegram/qr', (_req: Request, res: Response) => {
  try {
    // Resolve path relative to backend/src/
    // __dirname in dev is backend/src/, in prod is backend/dist/
    // So we want: backend/logs/telegram-bot-qr.png
    const qrPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../logs/telegram-bot-qr.png');
    
    // Set cache headers: cache for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('ETag', 'strong');
    
    res.sendFile(qrPath);
  } catch (err) {
    console.error('[telegram-qr] Error serving QR code:', err);
    res.status(404).json({ error: 'QR code not found. Make sure Telegram bot is initialized.' });
  }
});

// Telegram bot status endpoint
app.get('/api/telegram/status', (_req: Request, res: Response) => {
  const botInstance = getTelegramBot();
  
  res.json({
    initialized: botInstance !== null,
    hasToken: !!TELEGRAM_TOKEN,
    timestamp: new Date().toISOString(),
  });
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

// Initialize Telegram bot if token is provided
if (TELEGRAM_TOKEN) {
  initTelegramBot(TELEGRAM_TOKEN)
    .then((botInstance) => {
      if (!botInstance) {
        console.warn('[telegram-bot] ⚠ Failed to initialize Telegram bot (token may be invalid)');
        console.warn('[telegram-bot] QR code endpoint will return 404 until bot is restarted with valid token');
      }
    })
    .catch((err) => {
      console.error('[telegram-bot] Failed to initialize:', err.message);
      process.exit(1);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[server] Shutting down gracefully...');
  await stopTelegramBot();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[server] Received SIGTERM, shutting down gracefully...');
  await stopTelegramBot();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err.message);
  stopTelegramBot().finally(() => {
    process.exit(1);
  });
});
