/**
 * Symmetric encryption for secrets at rest (BYOK provider keys, channel tokens
 * in transit through the job queue). AES-256-GCM via Node's built-in crypto — no
 * external dependency, authenticated, server-only.
 *
 * Ciphertext layout: base64( iv(12) || authTag(16) || ciphertext ).
 * Key: ENCRYPTION_KEY = 32 bytes as base64 or hex. Never log plaintext.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { requireEnv } from "./env";

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function loadKey(): Buffer {
  const raw = requireEnv("ENCRYPTION_KEY").trim();
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        `Generate one with: openssl rand -base64 32`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(cipherText: string): string {
  const key = loadKey();
  const buf = Buffer.from(cipherText, "base64");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const enc = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
