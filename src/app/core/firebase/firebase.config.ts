/**
 * Firebase configuration sourced entirely from environment variables.
 *
 * Angular's build system exposes variables prefixed with NG_APP_ from .env.local
 * via import.meta.env at build time (no custom webpack config needed).
 *
 * ⚠️  Never commit real credentials. Copy .env.local.example → .env.local.
 */
export const firebaseConfig = {
  apiKey:            (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_FIREBASE_API_KEY'],
  authDomain:        (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_FIREBASE_AUTH_DOMAIN'],
  projectId:         (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_FIREBASE_PROJECT_ID'],
  storageBucket:     (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'],
  appId:             (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_FIREBASE_APP_ID'],
} as const;
