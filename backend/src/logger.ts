import { NextFunction, Request, Response } from 'express';

const logger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    console.log(
      `${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl} ${
        res.statusCode
      }`
    );
  });
  next();
};

export { logger };
