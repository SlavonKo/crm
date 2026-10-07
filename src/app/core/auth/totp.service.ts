import { Injectable } from '@angular/core';
import { TOTP } from 'otplib';
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble';
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure';
import QRCode from 'qrcode';

/** Application name shown in Google Authenticator */
const ISSUER = 'MotoWorkshop CRM';

/**
 * TotpService — wraps otplib v12 for browser-safe TOTP operations.
 *
 * Usage:
 *  - generateSecret()  → creates a fresh Base32 secret
 *  - getQrCodeDataUrl() → renders a QR-code PNG for Google Authenticator setup
 *  - verify()          → validates a 6-digit code against a stored secret
 */
@Injectable({ providedIn: 'root' })
export class TotpService {
  readonly #totp = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
  });

  // ─── Secret generation ─────────────────────────────────────────────────────

  /** Generate a new random Base32 TOTP secret (20 bytes = 160-bit). */
  generateSecret(): string {
    return this.#totp.generateSecret();
  }

  // ─── QR-code ───────────────────────────────────────────────────────────────

  /**
   * Build a `otpauth://` URI and render it as a base64 PNG data URL.
   * The QR-code is scanned by Google Authenticator during first-time setup.
   */
  async getQrCodeDataUrl(secret: string, accountEmail: string): Promise<string> {
    const uri = this.#totp.toURI({
      secret,
      label: accountEmail,
      issuer: ISSUER,
    });
    return QRCode.toDataURL(uri, { width: 256, margin: 2 });
  }

  // ─── Verification ──────────────────────────────────────────────────────────

  /**
   * Verify a 6-digit TOTP code.
   * Allows a ±1 time-step window (≈30 s) to tolerate minor clock drift.
   *
   * @returns true if the code is valid for the given secret at the current time.
   */
  async verify(token: string, secret: string): Promise<boolean> {
    try {
      const result = await this.#totp.verify(token, { secret, epochTolerance: 30 });
      return result.valid;
    } catch {
      return false;
    }
  }
}
