import crypto from 'crypto';

// Derive a stable 32-byte key from environment secrets
const getEncryptionKey = () => {
  const raw =
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'fallback-secret-change-in-production';

  // Always hash to 32 bytes so AES-256 key length is correct
  return crypto.createHash('sha256').update(String(raw)).digest();
};

/**
 * Encrypt a string using AES-256-GCM.
 * Returns a base64 string that concatenates IV, auth tag, and ciphertext.
 */
export const encrypt = (plainText) => {
  if (!plainText) return null;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

/**
 * Decrypt a string produced by encrypt().
 */
export const decrypt = (cipherText) => {
  if (!cipherText) return null;

  const key = getEncryptionKey();
  const data = Buffer.from(cipherText, 'base64');

  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

