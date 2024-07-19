import axios from 'axios';
import { Db } from 'mongodb';

class AuthService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }
  getAuthorizationUrl(clientId: string, redirectUri: string, state: string, scope: string): string {
    return `https://app.alpaca.markets/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
  }

  async getAccessToken(code: string): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.alpaca.markets/oauth/token',
        `grant_type=authorization_code&code=${code}&client_id=${process.env.ALPACA_CLIENT_ID}&client_secret=${process.env.ALPACA_CLIENT_SECRET}&redirect_uri=${process.env.ALPACA_REDIRECT_URI}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to get access token');
    }
  }

  public async storeToken(accessToken: string, email: string): Promise<void> {
    try {
      await this.db.collection('users').updateOne(
        { email },
        { $set: { alpacaToken: accessToken } },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store token');
    }
  }

  public async getToken(email: string): Promise<string | null> {
    try {
      const user = await this.db.collection('users').findOne({ email });
      return user?.alpacaToken || null;
    } catch (error) {
      console.error('Error retrieving token:', error);
      throw new Error('Failed to retrieve token');
    }
  }
}

export default AuthService;
