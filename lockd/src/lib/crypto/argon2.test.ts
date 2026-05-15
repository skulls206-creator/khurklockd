// @vitest-environment node
import { describe, it, expect } from "vitest";
import { deriveKey, deriveKeyForHmac } from "./argon2";

describe("deriveKey (Argon2id)", () => {
  it("returns a CryptoKey for AES-GCM", async () => {
    const password = "test-password-123";
    const salt = new Uint8Array(32).fill(1);

    const key = await deriveKey(password, salt);
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect(key.usages).toContain("encrypt");
    expect(key.usages).toContain("decrypt");
    expect(key.extractable).toBe(false);
  });

  it("returns a different key for a different password", async () => {
    const salt = new Uint8Array(32).fill(2);

    const encryptKey = await deriveKey("password-a", salt);
    const decryptKey = await deriveKey("password-b", salt);

    const { encryptVault } = await import("./encryption");
    const encrypted = await encryptVault("test", encryptKey);
    await expect(
      (await import("./encryption")).decryptVault(encrypted, decryptKey),
    ).rejects.toThrow();
  });

  it("supports config override", async () => {
    const password = "config-test";
    const salt = new Uint8Array(32).fill(3);

    const key = await deriveKey(password, salt, { iterations: 2, memory: 8192 });
    expect(key).toBeInstanceOf(CryptoKey);
  });
});

describe("deriveKeyForHmac", () => {
  it("returns a CryptoKey for HMAC", async () => {
    const password = "hmac-test";
    const salt = new Uint8Array(32).fill(4);

    const key = await deriveKeyForHmac(password, salt);
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.algorithm).toMatchObject({ name: "HMAC" });
    expect(key.usages).toContain("sign");
    expect(key.usages).toContain("verify");
  });
});
