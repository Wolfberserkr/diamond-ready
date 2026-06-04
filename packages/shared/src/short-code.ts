// 6-char base32 short codes for booking links. Crockford alphabet — no 0/O/1/I/L
// confusion, safe in URLs, easy to read aloud over a noisy boat ramp.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"; // 30 chars; 30^6 = ~729M codes
export const SHORT_CODE_LENGTH = 6;
export const SHORT_CODE_REGEX = new RegExp(`^[${ALPHABET}]{${SHORT_CODE_LENGTH}}$`);

export interface RandomSource {
  // Fill the buffer with random bytes. Compatible with both Web Crypto and Node crypto.
  getRandomValues(buf: Uint8Array): Uint8Array;
}

function defaultRandomSource(): RandomSource {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return crypto;
  }
  throw new Error("No crypto.getRandomValues available; pass a RandomSource explicitly");
}

export function generateShortCode(random: RandomSource = defaultRandomSource()): string {
  // Rejection sampling so the codes are uniformly distributed.
  // 256 % 30 = 16, so we discard bytes >= 240 to stay unbiased.
  const out: string[] = [];
  const buf = new Uint8Array(SHORT_CODE_LENGTH * 2);
  while (out.length < SHORT_CODE_LENGTH) {
    random.getRandomValues(buf);
    for (const byte of buf) {
      if (byte >= 240) continue;
      out.push(ALPHABET[byte % ALPHABET.length]!);
      if (out.length === SHORT_CODE_LENGTH) break;
    }
  }
  return out.join("");
}

export function isValidShortCode(code: string): boolean {
  return SHORT_CODE_REGEX.test(code);
}
