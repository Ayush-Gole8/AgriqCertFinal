import { Request, Response, NextFunction } from 'express';
import { errorHandler as baseErrorHandler } from './error.middleware.js';
import { notFoundHandler as baseNotFoundHandler } from './notFound.middleware.js';

export class AppError extends Error {
  statusCode: number;
  status: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.isOperational = true;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const asyncHandler = <
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>
>(
  fn: T,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  baseErrorHandler(err as any, req, res, next);
};

export const notFoundHandler = baseNotFoundHandler;

