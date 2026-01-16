import crypto from 'crypto';

const secretKey = process.env.AES_SECRET;

if (!secretKey) {
  throw new Error('AES_SECRET not configured');
}

const algorithm = 'aes-256-gcm';
const key = crypto.createHash('sha256').update(secretKey).digest();
const ivLength = 12;

export const encryptData = (data: string): string => {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

export const decryptData = (encryptedData: string): string => {
  const buffer = Buffer.from(encryptedData, 'base64');
  const iv = buffer.subarray(0, ivLength);
  const tag = buffer.subarray(ivLength, ivLength + 16);
  const text = buffer.subarray(ivLength + 16);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
  return decrypted.toString('utf8');
};
