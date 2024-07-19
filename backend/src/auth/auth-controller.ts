// auth-controller.ts
import { Request, Response } from 'express';
import AuthService from './auth-service';

class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
    this.authorize = this.authorize.bind(this);
    this.callback = this.callback.bind(this);
    this.storeToken = this.storeToken.bind(this);
  }

  public authorize(req: Request, res: Response): void {
    const clientId = process.env.ALPACA_CLIENT_ID!;
    const redirectUri = process.env.ALPACA_REDIRECT_URI!;
    const state = process.env.STATE!;
    const scope = "account:write trading data";

    const authorizationUrl = this.authService.getAuthorizationUrl(clientId, redirectUri, state, scope);
    res.redirect(authorizationUrl);
  }

  public async callback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query;

    if (state !== process.env.STATE) {
      res.status(400).send('Invalid state');
      return;
    }

    try {
      console.log("Authorization code received:", code);
      const tokenData = await this.authService.getAccessToken(code as string);
      console.log("Token data received:", tokenData);

      res.redirect(`https://quant-trader-ai-d1e6-v3.vercel.app/trade?access_token=${tokenData.access_token}`);
    } catch (error: any) {
      console.error("Failed to authenticate:", error.message);
      res.status(500).send('Failed to authenticate');
    }
  }

  public async storeToken(req: Request, res: Response): Promise<void> {
    const { accessToken, email } = req.body;

    if (!accessToken || !email) {
      res.status(400).send('Missing access token or email');
      return;
    }

    try {
      await this.authService.storeToken(accessToken, email);
      res.status(200).send('Token stored successfully');
    } catch (error) {
      console.error('Error storing token:', error);
      res.status(500).send('Failed to store token');
    }
  }
}

export default AuthController;
