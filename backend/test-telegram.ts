/**
 * Test script to verify Telegram bot configuration
 * Run with: npx ts-node backend/test-telegram.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TELEGRAM_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];

if (!TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env.local');
  console.error('Please add: TELEGRAM_BOT_TOKEN=your_token_here');
  process.exit(1);
}

console.log('✓ TELEGRAM_BOT_TOKEN found:', TELEGRAM_TOKEN.substring(0, 10) + '...');

// Verify token format
const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
if (!tokenRegex.test(TELEGRAM_TOKEN)) {
  console.error('❌ Invalid token format. Expected: NUMBERS:STRING');
  console.error('Got:', TELEGRAM_TOKEN);
  process.exit(1);
}

console.log('✓ Token format is valid');
console.log('✓ Ready to run: npm run dev');
