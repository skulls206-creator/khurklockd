import { describe, it, expect } from "vitest";
import {
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  bytesToBase64,
  constantTimeEqual,
  generateRandomBytes,
  CryptoEncodingError,
} from "./utils";

describe("hexToBytes", () => {
  it("decodes a hex string", () => {
    expect(hexToBytes("a1b2c3")).toEqual(new Uint8Array([0xa1, 0xb2, 0xc3]));
  });

  it("decodes uppercase hex", () => {
    expect(hexToBytes("A1B2C3")).toEqual(new Uint8Array([0xa1, 0xb2, 0xc3]));
  });

  it("strips optional 0x prefix", () => {
    expect(hexToBytes("0xa1b2")).toEqual(new Uint8Array([0xa1, 0xb2]));
    expect(hexToBytes("0XA1B2")).toEqual(new Uint8Array([0xa1, 0xb2]));
  });

  it("throws on odd-length input", () => {
    expect(() => hexToBytes("a1b")).toThrow(CryptoEncodingError);
  });

  it("throws on invalid characters", () => {
    expect(() => hexToBytes("zz")).toThrow(CryptoEncodingError);
  });
});

describe("bytesToHex", () => {
  it("encodes bytes to lowercase hex", () => {
    expect(bytesToHex(new Uint8Array([0xa1, 0xb2, 0xc3]))).toBe("a1b2c3");
  });

  it("pads single-digit hex values", () => {
    expect(bytesToHex(new Uint8Array([0x0a, 0x01]))).toBe("0a01");
  });

  it("roundtrips with hexToBytes", () => {
    const input = "deadbeef0123";
    expect(bytesToHex(hexToBytes(input))).toBe(input);
  });
});

describe("base64ToBytes / bytesToBase64", () => {
  it("roundtrips", () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]);
    const encoded = bytesToBase64(original);
    expect(encoded).toBe("SGVsbG8=");
    expect(base64ToBytes(encoded)).toEqual(original);
  });

  it("decodes standard base64", () => {
    expect(base64ToBytes("SGVsbG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("throws on invalid base64", () => {
    expect(() => base64ToBytes("!!!")).toThrow(CryptoEncodingError);
  });
});

describe("constantTimeEqual", () => {
  it("returns true for identical arrays", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it("returns false for different arrays", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
  });

  it("returns false for different-length arrays", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false);
  });

  it("handles empty arrays", () => {
    expect(constantTimeEqual(new Uint8Array([]), new Uint8Array([]))).toBe(true);
  });
});

describe("generateRandomBytes", () => {
  it("returns the requested byte count", () => {
    expect(generateRandomBytes(32).length).toBe(32);
    expect(generateRandomBytes(12).length).toBe(12);
  });

  it("produces different values each call", () => {
    const a = generateRandomBytes(16);
    const b = generateRandomBytes(16);
    expect(a).not.toEqual(b);
  });
});
