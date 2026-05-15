// ── Khurklockd TOTP Module ─────────────────────────────────────
// Barrel export for the TOTP engine.

export {
  base32ToBytes,
  generateTOTP,
  verifyTOTP,
  getRemainingSeconds,
  generateTOTPFromConfig,
  verifyTOTPFromConfig,
} from "./totp";

export { parseOTPAuthURL, toTOTPConfig } from "./key";
export type { ParsedOTPAuthURL } from "./key";
