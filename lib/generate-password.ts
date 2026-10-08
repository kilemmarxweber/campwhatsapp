import { randomBytes } from "node:crypto";

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "@#$%&*-_=+";
const ALPHABET = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(pool: string, byte: number) {
  return pool[byte % pool.length] ?? pool[0]!;
}

/** Mot de passe temporaire compatible Better Auth. */
export function generateSecurePassword(length = 16) {
  const target = Math.min(Math.max(length, 8), 64);
  const bytes = randomBytes(target);
  const chars: string[] = [];
  for (let i = 0; i < target; i++) chars.push(pick(ALPHABET, bytes[i]!));
  chars[0] = pick(LOWER, bytes[0]!);
  chars[1] = pick(UPPER, bytes[1]!);
  chars[2] = pick(DIGITS, bytes[2]!);
  chars[3] = pick(SYMBOLS, bytes[3]!);
  return chars.join("");
}
