import { randomBytes, scrypt } from 'node:crypto';

export function derivePassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64,
    { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
    (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return 'scrypt-v1$' + salt + '$' + (await derivePassword(password, salt)).toString('hex');
}
