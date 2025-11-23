import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export default class GoogleAuthService {
  private static instance: GoogleAuthService | null = null;
  private client: OAuth2Client;

  private constructor(client: OAuth2Client) {
    this.client = client;
  }

  /**
   * Initializes the singleton instance (if not already initialized).
   * This must be awaited ONCE at app startup.
   * Returns true if initialized successfully, false if credentials are missing.
   */
  public static async init(): Promise<boolean> {
    if (GoogleAuthService.instance) {
      return true; // already initialized
    }

    const isProd = process.env.NODE_ENV === 'production';

    const keyFilePath = isProd
      ? process.env.PROD_CREDENTIALS_PATH
      : 'credentials.json';

    // Check if credentials file exists
    const fs = await import('fs');
    if (!keyFilePath || !fs.existsSync(keyFilePath)) {
      console.warn('⚠️  Google credentials not found. Google Sheets integration disabled.');
      return false;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });

      const client = (await auth.getClient()) as OAuth2Client;

      GoogleAuthService.instance = new GoogleAuthService(client);
      console.log('✅ Google Sheets integration initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets:', error);
      return false;
    }
  }

  /**
   * Returns the already-initialized singleton instance.
   * Throws if init() has not been called yet.
   */
  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      throw new Error(
        'GoogleAuthService has not been initialized. Call GoogleAuthService.init() first.'
      );
    }
    return GoogleAuthService.instance;
  }

  public getAuth(): OAuth2Client {
    return this.client;
  }
}
