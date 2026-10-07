#!/usr/bin/env node
/**
 * dev-start.js
 *
 * Pre-flight check that runs before `npm run dev`.
 *
 * Logic:
 *   1. If .env.local exists → nothing to do, proceed.
 *   2. If .env.encrypted exists + SERVER_SECRET is set → decrypt automatically.
 *   3. If .env.encrypted exists but SERVER_SECRET is missing → error with hint.
 *   4. If neither file exists → error, point developer to .env.local.example.
 *
 * Exit codes:
 *   0 — .env.local is ready (dev can start)
 *   1 — fatal: developer must intervene
 */

const CryptoJS = require('crypto-js');
const fs       = require('fs');
const path     = require('path');

const ROOT           = path.resolve(__dirname, '..');
const ENV_LOCAL      = path.join(ROOT, '.env.local');
const ENV_ENCRYPTED  = path.join(ROOT, '.env.encrypted');

// ─── 1. .env.local already present ───────────────────────────────────────────

if (fs.existsSync(ENV_LOCAL)) {
  console.log('[dev-start] ✓ .env.local found — ready to start.');
  process.exit(0);
}

// ─── 2. Try to decrypt from .env.encrypted ────────────────────────────────────

if (!fs.existsSync(ENV_ENCRYPTED)) {
  console.error('\n[dev-start] ✗ Neither .env.local nor .env.encrypted found.');
  console.error('  → Copy .env.local.example to .env.local and fill in your values.');
  console.error('  → Then run: npm run env:encrypt\n');
  process.exit(1);
}

const secret = process.env['SERVER_SECRET'];

if (!secret) {
  console.error('\n[dev-start] ✗ .env.encrypted found but SERVER_SECRET is not set.');
  console.error('  → Set the variable in your shell before running dev:');
  console.error('     export SERVER_SECRET=your-secret');
  console.error('     npm run dev\n');
  process.exit(1);
}

// ─── 3. Decrypt ───────────────────────────────────────────────────────────────

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(ENV_ENCRYPTED, 'utf8'));
} catch {
  console.error('[dev-start] ✗ .env.encrypted is not valid JSON. Re-run: npm run env:encrypt');
  process.exit(1);
}

let decrypted;
try {
  const bytes = CryptoJS.AES.decrypt(parsed.cipher, secret);
  decrypted   = bytes.toString(CryptoJS.enc.Utf8);
} catch {
  decrypted = '';
}

if (!decrypted) {
  console.error('\n[dev-start] ✗ Decryption failed. Wrong SERVER_SECRET?');
  process.exit(1);
}

fs.writeFileSync(ENV_LOCAL, decrypted, 'utf8');
console.log('[dev-start] ✓ .env.local restored from .env.encrypted — ready to start.');
process.exit(0);
