import * as crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly ENCODING = 'hex';

  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static encrypt(data: string, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);

      let encrypted = cipher.update(data, 'utf8', this.ENCODING);
      encrypted += cipher.final(this.ENCODING);

      // Return IV + encrypted data
      return iv.toString(this.ENCODING) + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  static decrypt(encryptedData: string, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const parts = encryptedData.split(':');
      
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], this.ENCODING);
      const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);

      let decrypted = decipher.update(parts[1], this.ENCODING, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  static verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
}