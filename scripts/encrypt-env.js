#!/usr/bin/env node
/**
 * encrypt-env.js
 *
 * Encrypts .env.local → .env.encrypted using AES-256 (CryptoJS).
 * The encryption key is read from the SERVER_SECRET variable inside .env.local.
 *
 * Usage:
 *   node scripts/encrypt-env.js
 *
 * Output:
 *   .env.encrypted  — ciphertext, safe to commit to version control
 *
 * NEVER commit .env.local itself.
 */

const CryptoJS = require('crypto-js');
const fs       = require('fs');
const path     = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT        = path.resolve(__dirname, '..');
const ENV_FILE    = path.join(ROOT, '.env.local');
const OUTPUT_FILE = path.join(ROOT, '.env.encrypted');

// ─── Read .env.local ──────────────────────────────────────────────────────────

if (!fs.existsSync(ENV_FILE)) {
  console.error('[encrypt-env] ERROR: .env.local not found.');
  console.error('  Copy .env.local.example to .env.local and fill in your values.');
  process.exit(1);
}

const envContent = fs.readFileSync(ENV_FILE, 'utf8');

// ─── Extract SERVER_SECRET ────────────────────────────────────────────────────

const secretMatch = envContent.match(/^SERVER_SECRET\s*=\s*(.+)$/m);
if (!secretMatch) {
  console.error('[encrypt-env] ERROR: SERVER_SECRET not found in .env.local.');
  process.exit(1);
}

const secret = secretMatch[1].trim();
if (secret.length < 32) {
  console.error('[encrypt-env] ERROR: SERVER_SECRET must be at least 32 characters.');
  process.exit(1);
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

const cipher     = CryptoJS.AES.encrypt(envContent, secret).toString();
const outputData = JSON.stringify({ v: 1, cipher }, null, 2);

fs.writeFileSync(OUTPUT_FILE, outputData, 'utf8');

console.log('[encrypt-env] ✓ .env.encrypted written successfully.');
console.log('  You can now commit .env.encrypted to version control.');
console.log('  Keep SERVER_SECRET secret — do NOT commit it.');
