import { Request, Response } from 'express';
import { Batch } from '../models/Batch.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { PaginatedResponse } from '../types/index.js';

export class BatchController {
  /**
   * Create new batch
   */
  static createBatch = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const batchData = {
      ...req.body,
      farmerId: req.user.userId,
      farmerName: req.user.name,
      status: 'draft',
    };

    const batch = await Batch.create(batchData);

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'BATCH_CREATED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
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

    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      status,
      productType,
      search,
    } = req.query as any;

    const query: any = {};

    // Role-based filtering
    if (req.user.role === 'farmer') {
      query.farmerId = req.user.userId;
    }

    // Apply filters
    if (status) query.status = status;
    if (productType) query.productType = productType;
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    const [batches, total] = await Promise.all([
      Batch.find(query)
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Batch.countDocuments(query),
    ]);

    const response: PaginatedResponse<any> = {
      data: batches,
      total,
      page: parseInt(page),
      pageSize: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };

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

    const batch = await Batch.findById(id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // Check access permissions
    if (
      req.user?.role === 'farmer' &&
      batch.farmerId !== req.user.userId
    ) {
      throw new AppError(403, 'Access denied');
    }

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
    const batch = await Batch.findById(id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // Check ownership
    if (
      req.user.role === 'farmer' &&
      batch.farmerId !== req.user.userId
    ) {
      throw new AppError(403, 'Access denied');
    }

    // Farmers can only edit drafts
    if (req.user.role === 'farmer' && batch.status !== 'draft') {
      throw new AppError(400, 'Cannot edit submitted batch');
    }

    Object.assign(batch, req.body);
    await batch.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'BATCH_UPDATED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
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
    const batch = await Batch.findById(id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // Check ownership
    if (batch.farmerId !== req.user.userId) {
      throw new AppError(403, 'Access denied');
    }

    if (batch.status !== 'draft') {
      throw new AppError(400, 'Batch already submitted');
    }

    batch.status = 'submitted';
    batch.submittedAt = new Date();
    await batch.save();

    // Create notification for QA inspectors
    // (In production, you'd notify specific inspectors)
    await Notification.create({
      userId: req.user.userId, // Placeholder - should notify QA team
      type: 'batch_submitted',
      title: 'New Batch Submitted',
      message: `Batch ${batch.productName} has been submitted for inspection`,
      read: false,
      actionUrl: `/batches/${batch._id}`,
    });

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'BATCH_SUBMITTED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
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
    const batch = await Batch.findById(id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // Check ownership or admin
    if (
      req.user.role !== 'admin' &&
      batch.farmerId !== req.user.userId
    ) {
      throw new AppError(403, 'Access denied');
    }

    // Can only delete drafts
    if (batch.status !== 'draft') {
      throw new AppError(400, 'Cannot delete submitted batch');
    }

    await batch.deleteOne();

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'BATCH_DELETED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
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

    const query: any = {};
    
    if (req.user.role === 'farmer') {
      query.farmerId = req.user.userId;
    }

    const stats = await Batch.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = stats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        total: stats.reduce((sum, s) => sum + s.count, 0),
        byStatus: statsMap,
      },
    });
  });
}
