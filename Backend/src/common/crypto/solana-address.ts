import { PublicKey } from "@solana/web3.js";

// A Solana account address is a base58-encoded 32-byte ed25519 public key, which renders
// as 32–44 base58 characters. base58 excludes the ambiguous characters 0 (zero), O, I, and
// l. The regex is a cheap first pass; `isSolanaAddress` additionally confirms the value
// decodes to a real 32-byte key (some regex-passing strings do not), so callers never hand
// a malformed address to web3.js and trigger a 500.
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaAddress(value: string): boolean {
  if (!SOLANA_ADDRESS_RE.test(value)) return false;
  try {
    void new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export { SOLANA_ADDRESS_RE };
