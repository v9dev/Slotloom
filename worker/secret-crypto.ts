import { CompactEncrypt, base64url, compactDecrypt } from "jose";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encryptionKey(secret?: string) {
  if (!secret?.trim())
    throw new Error(
      "OAuth encryption is not configured. Add the OAUTH_ENCRYPTION_KEY Worker secret.",
    );
  let key: Uint8Array;
  try {
    const normalized = secret
      .trim()
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    key = base64url.decode(normalized);
  } catch {
    throw new Error(
      "OAUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  if (key.byteLength !== 32)
    throw new Error(
      "OAUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  return key;
}

export function oauthEncryptionReady(secret?: string) {
  try {
    encryptionKey(secret);
    return true;
  } catch {
    return false;
  }
}

export async function encryptSecret(value: string, secret?: string) {
  return new CompactEncrypt(encoder.encode(value))
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      typ: "slotloom-secret+jwe",
    })
    .encrypt(encryptionKey(secret));
}

export async function decryptSecret(value: string, secret?: string) {
  const result = await compactDecrypt(value, encryptionKey(secret));
  return decoder.decode(result.plaintext);
}

export function randomUrlSafe(byteLength = 32) {
  return base64url.encode(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256UrlSafe(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64url.encode(new Uint8Array(digest));
}
