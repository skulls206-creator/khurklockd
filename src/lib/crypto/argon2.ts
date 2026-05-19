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

/**
 * Create a domain-separated salt by appending a context label, then hashing
 * the result with Argon2id itself (producing 32 bytes of domain-separated salt).
 *
 * This ensures that even if the same master password and base salt are used
 * for different purposes (e.g., encryption vs HMAC), they produce
 * independent, uncorrelated derived keys.
 */
async function makeDomainSalt(
  password: string,
  baseSalt: Uint8Array,
  domain: string,
): Promise<Uint8Array> {
  // Concatenate the original salt with the domain label
  const encoder = new TextEncoder();
  const domainBytes = encoder.encode(domain);
  const combined = new Uint8Array(baseSalt.length + domainBytes.length);
  combined.set(baseSalt);
  combined.set(domainBytes, baseSalt.length);

  // Hash the combined salt to get a deterministic domain-separated salt
  // We use Argon2id with minimal cost since this is just a domain separation
  // step — the main KDF already provides the full work factor.
  // Using the password as input prevents pre-computation of domain salts.
  return argon2id({
    password: password.normalize("NFC"),
    salt: combined,
    parallelism: 1,
    iterations: 1,
    memorySize: 1024,
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
  // Domain-separated salt to produce an independent key from encryption
  const hmacSalt = await makeDomainSalt(password, salt, "khurklockd-hmac-v1");

  const cfg: Argon2Config = { ...DEFAULT_CONFIG, ...config };
  const raw = await argon2id({
    password: password.normalize("NFC"),
    salt: hmacSalt,
    parallelism: cfg.parallelism,
    iterations: cfg.iterations,
    memorySize: cfg.memory,
    hashLength: 32,
    outputType: "binary",
  });

  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
