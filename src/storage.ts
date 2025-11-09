import * as fs from 'fs';
import * as path from 'path';
import { AuthToken } from './types';

export interface StoredToken extends AuthToken {
  created_at: number;
}

/**
 * Token storage manager for persisting OAuth tokens
 */
export class TokenStorage {
  private tokenPath: string;

  constructor(tokenPath?: string) {
    this.tokenPath = tokenPath || path.join(process.cwd(), '.viessmann-token.json');
  }

  /**
   * Save token to file
   */
  async saveToken(token: AuthToken): Promise<void> {
    const storedToken: StoredToken = {
      ...token,
      created_at: Date.now()
    };

    await fs.promises.writeFile(
      this.tokenPath,
      JSON.stringify(storedToken, null, 2),
      'utf-8'
    );
  }

  /**
   * Load token from file
   */
  async loadToken(): Promise<StoredToken | null> {
    try {
      const data = await fs.promises.readFile(this.tokenPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token exists
   */
  async hasToken(): Promise<boolean> {
    try {
      await fs.promises.access(this.tokenPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete stored token
   */
  async deleteToken(): Promise<void> {
    try {
      await fs.promises.unlink(this.tokenPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Check if stored token is expired
   */
  isTokenExpired(token: StoredToken): boolean {
    const expiresAt = token.created_at + (token.expires_in * 1000);
    // Consider expired if less than 5 minutes remaining
    return Date.now() >= (expiresAt - 5 * 60 * 1000);
  }
}
