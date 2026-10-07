#!/usr/bin/env node
/**
 * decrypt-env.js
 *
 * Decrypts .env.encrypted → .env.local using the SERVER_SECRET passed
 * as an environment variable.  Run this on a fresh machine / CI environment
 * that has the secret but NOT .env.local.
 *
 * Usage:
 *   SERVER_SECRET=your-secret node scripts/decrypt-env.js
 *
 * Output:
 *   .env.local  — plaintext env file (never committed)
 */

const CryptoJS = require('crypto-js');
const fs       = require('fs');
const path     = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT           = path.resolve(__dirname, '..');
const ENCRYPTED_FILE = path.join(ROOT, '.env.encrypted');
const OUTPUT_FILE    = path.join(ROOT, '.env.local');

// ─── Validate inputs ──────────────────────────────────────────────────────────

const secret = process.env['SERVER_SECRET'];
if (!secret) {
  console.error('[decrypt-env] ERROR: SERVER_SECRET environment variable is not set.');
  console.error('  Usage: SERVER_SECRET=your-secret node scripts/decrypt-env.js');
  process.exit(1);
}

if (!fs.existsSync(ENCRYPTED_FILE)) {
  console.error('[decrypt-env] ERROR: .env.encrypted not found.');
  process.exit(1);
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(ENCRYPTED_FILE, 'utf8'));
} catch {
  console.error('[decrypt-env] ERROR: .env.encrypted is not valid JSON.');
  process.exit(1);
}

let decrypted;
try {
  const bytes = CryptoJS.AES.decrypt(parsed.cipher, secret);
  decrypted   = bytes.toString(CryptoJS.enc.Utf8);
} catch {
  console.error('[decrypt-env] ERROR: Decryption failed. Wrong SERVER_SECRET?');
  process.exit(1);
}

if (!decrypted) {
  console.error('[decrypt-env] ERROR: Decryption produced empty output. Wrong SERVER_SECRET?');
  process.exit(1);
}

// ─── Write .env.local ─────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT_FILE, decrypted, 'utf8');

console.log('[decrypt-env] ✓ .env.local restored successfully.');
