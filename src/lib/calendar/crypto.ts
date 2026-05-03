// =============================================================================
// AGENTIC CALENDAR — AES-256-GCM Token Encryption
// Encrypts/decrypts OAuth tokens before storing in PostgreSQL.
// Key comes from CALENDAR_ENCRYPTION_KEY env var (32-byte hex string).
// =============================================================================
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyHex = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "CALENDAR_ENCRYPTION_KEY env var is required for calendar sync"
    );
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("CALENDAR_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string: iv (12 bytes) + ciphertext + authTag (16 bytes).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: iv + ciphertext + authTag
  const packed = Buffer.concat([iv, encrypted, authTag]);
  return packed.toString("base64");
}

/**
 * Decrypt an AES-256-GCM encrypted base64 string.
 * Expects format: iv (12 bytes) + ciphertext + authTag (16 bytes).
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKey();
  const packed = Buffer.from(encryptedBase64, "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(packed.length - TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH, packed.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Encrypt an OAuth token pair for storage.
 */
export function encryptTokens(tokens: {
  accessToken: string;
  refreshToken?: string | null;
}): {
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
} {
  return {
    accessTokenEnc: encrypt(tokens.accessToken),
    refreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
  };
}

/**
 * Decrypt stored OAuth tokens.
 */
export function decryptTokens(stored: {
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
}): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: stored.accessTokenEnc ? decrypt(stored.accessTokenEnc) : null,
    refreshToken: stored.refreshTokenEnc
      ? decrypt(stored.refreshTokenEnc)
      : null,
  };
}

// ─── HMAC-Signed OAuth State ─────────────────────────────────────────────────
// Prevents state-parameter tampering during OAuth flows.
// Format: base64url(JSON({ data, ts, sig }))
// Signature: HMAC-SHA256(data + "." + ts, key)
// TTL: 10 minutes (sufficient for user to complete OAuth consent)

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Sign an OAuth state payload (e.g. userProfileId) with HMAC-SHA256.
 * Returns a URL-safe base64 string containing the data, timestamp, and signature.
 */
export function signOAuthState(data: string): string {
  const key = getKey();
  const ts = Date.now().toString();
  const message = `${data}.${ts}`;
  const sig = crypto.createHmac("sha256", key).update(message).digest("hex");

  const payload = JSON.stringify({ data, ts, sig });
  return Buffer.from(payload).toString("base64url");
}

/**
 * Verify and extract the original data from an HMAC-signed OAuth state string.
 * Returns the original data string if valid, or null if tampered/expired.
 */
export function verifyOAuthState(state: string): string | null {
  try {
    const key = getKey();
    const payload = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );

    const { data, ts, sig } = payload;
    if (typeof data !== "string" || typeof ts !== "string" || typeof sig !== "string") {
      return null;
    }

    // Verify HMAC signature
    const message = `${data}.${ts}`;
    const expected = crypto.createHmac("sha256", key).update(message).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }

    // Check TTL
    const timestamp = parseInt(ts, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > OAUTH_STATE_TTL_MS) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
