import { Request, Response, NextFunction } from 'express';

export function monitoringSecretMiddleware(req: Request, res: Response, next: NextFunction) {
  const secretHeader = req.header('X-API-Secret');
  const expectedSecret = process.env.MONITORING_API_SECRET;
  if (!secretHeader || secretHeader !== expectedSecret) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API secret.' } });
  }
  next();
}
