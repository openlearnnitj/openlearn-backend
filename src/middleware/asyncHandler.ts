/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass them to Express error handler
 */

import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
