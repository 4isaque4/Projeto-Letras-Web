import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [salt, savedKey] = encoded.split(':');

  if (!salt || !savedKey) {
    return false;
  }

  const expected = Buffer.from(savedKey, 'hex');
  const actual = scryptSync(password, salt, KEY_LENGTH);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function createSessionToken(prefix = 'letras'): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}
