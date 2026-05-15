import { argon2id } from "hash-wasm";

export interface Argon2Config {
  iterations: number;
  memory: number;
  parallelism: number;
}

const DEFAULT_CONFIG: Readonly<Argon2Config> = {
  iterations: 3,
  memory: 65536,
  parallelism: 4,
};

async function deriveRawKey(
  password: string,
  salt: Uint8Array,
  config?: Partial<Argon2Config>,
): Promise<Uint8Array> {
  const cfg: Argon2Config = { ...DEFAULT_CONFIG, ...config };
  return argon2id({
    password: password.normalize("NFC"),
    salt,
    parallelism: cfg.parallelism,
    iterations: cfg.iterations,
    memorySize: cfg.memory,
    hashLength: 32,
    outputType: "binary",
  });
}

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  config?: Partial<Argon2Config>,
): Promise<CryptoKey> {
  const raw = await deriveRawKey(password, salt, config);
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function deriveKeyForHmac(
  password: string,
  salt: Uint8Array,
  config?: Partial<Argon2Config>,
): Promise<CryptoKey> {
  const raw = await deriveRawKey(password, salt, config);
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
