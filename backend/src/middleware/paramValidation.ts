import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AppError } from './errorHandler.js';

/**
 * Middleware to validate MongoDB ObjectId parameters
 */
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const paramValue = req.params[paramName];
    
    if (!paramValue) {
      throw new AppError(400, `Missing parameter: ${paramName}`);
    }
    
    if (!Types.ObjectId.isValid(paramValue)) {
      throw new AppError(400, `Invalid ${paramName}: must be a valid MongoDB ObjectId`);
    }
    
    next();
  };
};

/**
 * Middleware to validate multiple ObjectId parameters
 */
export const validateObjectIds = (...paramNames: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const paramName of paramNames) {
      const paramValue = req.params[paramName];
      
      if (!paramValue) {
        throw new AppError(400, `Missing parameter: ${paramName}`);
      }
      
      if (!Types.ObjectId.isValid(paramValue)) {
        throw new AppError(400, `Invalid ${paramName}: must be a valid MongoDB ObjectId`);
      }
    }
    
    next();
  };
};

/**
 * Middleware to catch and transform MongoDB cast errors
 */
export const handleMongoErrors = (
  error: any,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Handle MongoDB Cast Error
  if (error.name === 'CastError') {
    const message = `Invalid ${error.path}: ${error.value}`;
    const transformedError = new AppError(400, message);
    return next(transformedError);
  }

  // Handle MongoDB Validation Error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((val: any) => val.message);
    const message = `Validation Error: ${errors.join('. ')}`;
    const transformedError = new AppError(400, message);
    return next(transformedError);
  }

  // Handle MongoDB Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    const message = `Duplicate value for ${field}`;
    const transformedError = new AppError(400, message);
    return next(transformedError);
  }

  next(error);
};