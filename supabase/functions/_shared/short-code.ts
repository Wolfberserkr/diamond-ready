// Mirrors packages/shared/src/short-code.ts — keep in sync.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 6;

export function generateShortCode(): string {
  const out: string[] = [];
  const buf = new Uint8Array(LENGTH * 2);
  while (out.length < LENGTH) {
    crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (byte >= 240) continue;
      out.push(ALPHABET[byte % ALPHABET.length]);
      if (out.length === LENGTH) break;
    }
  }
  return out.join("");
}
