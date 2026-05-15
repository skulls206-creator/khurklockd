// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeHmac, verifyHmac, wipeKey } from "./integrity";

async function makeHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new Uint8Array(32).fill(99),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

describe("computeHmac / verifyHmac", () => {
  it("computes and verifies a tag", async () => {
    const key = await makeHmacKey();
    const data = "hello world";

    const tag = await computeHmac(data, key);
    expect(tag).toMatch(/^[0-9a-f]{64}$/);

    const valid = await verifyHmac(data, tag, key);
    expect(valid).toBe(true);
  });

  it("rejects tampered data", async () => {
    const key = await makeHmacKey();
    const tag = await computeHmac("original", key);
    const valid = await verifyHmac("tampered", tag, key);
    expect(valid).toBe(false);
  });

  it("rejects wrong tag", async () => {
    const key = await makeHmacKey();
    const valid = await verifyHmac("data", "0000000000000000000000000000000000000000000000000000000000000000", key);
    expect(valid).toBe(false);
  });
});

describe("wipeKey", () => {
  it("nullifies the key reference", () => {
    const container: { current: CryptoKey | null } = { current: {} as CryptoKey };
    wipeKey(container);
    expect(container.current).toBeNull();
  });
});
