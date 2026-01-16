import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.middleware.js';
import { BatchService } from '../services/batch.service.js';

export class BatchController {
  /**
   * Create new batch
   */
  static createBatch = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const batch = await BatchService.createBatch({
      data: req.body,
      user: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: { batch },
    });
  });

  /**
   * Get all batches with pagination and filters
   */
  static getBatches = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const response = await BatchService.getBatches({
      user: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
      ...(req.query as any),
    });

    res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * Get batch by ID
   */
  static getBatchById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const batch = await BatchService.getBatchById({
      id,
      user: req.user && {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
    });

    res.status(200).json({
      success: true,
      data: { batch },
    });
  });

  /**
   * Update batch
   */
  static updateBatch = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const batch = await BatchService.updateBatch({
      id,
      payload: req.body,
      user: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: { batch },
    });
  });

  /**
   * Submit batch for inspection
   */
  static submitBatch = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const batch = await BatchService.submitBatch({
      id,
      user: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Batch submitted successfully',
      data: { batch },
    });
  });

  /**
   * Delete batch (soft delete by setting status)
   */
  static deleteBatch = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    await BatchService.deleteBatch({
      id,
      user: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
    });
  });

  /**
   * Get batch statistics
   */
  static getBatchStats = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const result = await BatchService.getBatchStats({
      user: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
      },
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}
