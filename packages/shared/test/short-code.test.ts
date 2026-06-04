import { describe, expect, it } from "vitest";
import {
  generateShortCode,
  isValidShortCode,
  SHORT_CODE_LENGTH,
  SHORT_CODE_REGEX,
} from "../src/short-code.js";

describe("generateShortCode", () => {
  it("returns codes of the right length, from the allowed alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateShortCode();
      expect(code).toHaveLength(SHORT_CODE_LENGTH);
      expect(code).toMatch(SHORT_CODE_REGEX);
    }
  });

  it("uses an injected random source deterministically", () => {
    let n = 0;
    const code = generateShortCode({
      getRandomValues(buf) {
        for (let i = 0; i < buf.length; i++) {
          buf[i] = n++;
        }
        return buf;
      },
    });
    // First six bytes are 0..5 mod 30 -> first 6 chars of the alphabet.
    expect(code).toBe("234567");
  });

  it("rejects bytes >= 240 to stay unbiased", () => {
    const code = generateShortCode({
      getRandomValues(buf) {
        // Alternating 240 (rejected) and 0 (kept -> '2').
        for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 240 : 0;
        return buf;
      },
    });
    expect(code).toBe("2".repeat(SHORT_CODE_LENGTH));
  });
});

describe("isValidShortCode", () => {
  it("accepts codes from the alphabet", () => {
    expect(isValidShortCode("ABCDEF")).toBe(true);
    expect(isValidShortCode("234567")).toBe(true);
  });

  it("rejects forbidden Crockford characters and wrong lengths", () => {
    expect(isValidShortCode("ABCDE")).toBe(false); // too short
    expect(isValidShortCode("ABCDEFG")).toBe(false); // too long
    expect(isValidShortCode("0BCDEF")).toBe(false); // 0 not in alphabet
    expect(isValidShortCode("OBCDEF")).toBe(false); // O not in alphabet
    expect(isValidShortCode("1BCDEF")).toBe(false); // 1 not in alphabet
    expect(isValidShortCode("IBCDEF")).toBe(false); // I not in alphabet
    expect(isValidShortCode("LBCDEF")).toBe(false); // L not in alphabet
    expect(isValidShortCode("abcdef")).toBe(false); // lowercase not allowed
  });
});
