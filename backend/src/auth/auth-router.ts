import { Router } from 'express';
import AuthService from './auth-service';
import AuthController from './auth-controller';
import { Db } from 'mongodb';


const createAuthRouter = async (db: Db) => {
  const router = Router();
  const authService = new AuthService(db);
  const authController = new AuthController(authService);

  router.get('/oauth/authorize', authController.authorize);
  router.get('/oauth/callback', authController.callback);
  router.post('/oauth/store_token', authController.storeToken);

  return router;
}

export default createAuthRouter;
