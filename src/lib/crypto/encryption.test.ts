// @vitest-environment node
import { describe, it, expect } from "vitest";
import { encryptVault, decryptVault, DecryptionError } from "./encryption";

async function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new Uint8Array(32).fill(42),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

describe("encryptVault / decryptVault", () => {
  it("encrypts and decrypts a simple payload", async () => {
    const key = await makeKey();
    const payload = { hello: "world" };

    const encrypted = await encryptVault(payload, key);
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.iv.length).toBe(24); // 12 bytes = 24 hex chars

    const decrypted = await decryptVault(encrypted, key);
    expect(decrypted).toEqual(payload);
  });

  it("produces different ciphertexts for the same payload (fresh nonce)", async () => {
    const key = await makeKey();
    const payload = { test: true };

    const a = await encryptVault(payload, key);
    const b = await encryptVault(payload, key);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("decrypt fails with wrong key", async () => {
    const key1 = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(32).fill(1),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const key2 = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(32).fill(2),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );

    const encrypted = await encryptVault("secret", key1);
    await expect(decryptVault(encrypted, key2)).rejects.toThrow(DecryptionError);
  });
});
