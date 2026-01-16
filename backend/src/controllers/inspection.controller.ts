import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.middleware.js';
import { InspectionService } from '../services/inspection.service.js';

export class InspectionController {
  /**
   * Create new inspection for a batch
   */
  static createInspection = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { batchId } = req.params;
    const inspectionData = req.body;

    const { inspection, alreadyExists } = await InspectionService.createInspection({
      batchId,
      inspectionData,
      user: req.user,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (alreadyExists) {
      return res.status(200).json({
        success: true,
        message: 'Inspection already exists for this batch',
        data: { inspection },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Inspection created successfully',
      data: { inspection },
    });
  });

  /**
   * Get inspections with pagination and filters
   */
  static getInspections = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const {
      page = 1,
      limit = 10,
      status,
      batchId,
      inspectorId,
    } = req.query as any;

    const result = await InspectionService.getInspections({
      user: req.user,
      page,
      limit,
      status,
      batchId,
      inspectorId,
    });

    res.status(200).json({
      success: true,
      data: {
        inspections: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.pageSize,
          totalPages: result.totalPages,
        },
      },
    });
  });

  /**
   * Get inspection by ID
   */
  static getInspectionById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const inspection = await InspectionService.getInspectionById({
      id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: { inspection },
    });
  });

  /**
   * Update inspection
   */
  static updateInspection = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const updateData = req.body;
    const updatedInspection = await InspectionService.updateInspection({
      id,
      updateData,
      user: req.user,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Inspection updated successfully',
      data: { inspection: updatedInspection },
    });
  });

  /**
   * Complete inspection
   */
  static completeInspection = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const { passed, comments, readings, overallResult, outcome, notes } = req.body;
    const updatedInspection = await InspectionService.completeInspection({
      id,
      payload: {
        passed,
        comments,
        readings,
        overallResult,
        outcome,
        notes,
      },
      user: req.user,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Inspection completed successfully',
      data: { inspection: updatedInspection },
    });
  });

  /**
   * Get inspections for a specific batch
   */
  static getInspectionsByBatch = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;

    const inspections = await InspectionService.getInspectionsByBatch(batchId);

    res.status(200).json({
      success: true,
      data: { inspections },
    });
  });

  /**
   * Save inspection draft with autosave functionality
   */
  static saveDraft = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const draftData = req.body;
    const { inspection: updatedInspection, savedAt } =
      await InspectionService.saveDraft({
        id,
        draftData,
        user: req.user,
      });

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully',
      data: {
        inspection: updatedInspection,
        savedAt,
      },
    });
  });

  /**
   * Get validation rules for a batch based on product type
   */
  static getValidationRules = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { batchId } = req.params;
    const { rules, batchInfo } = await InspectionService.getValidationRules({
      batchId,
    });

    res.status(200).json({
      success: true,
      data: {
        rules,
        batchInfo,
      },
    });
  });
}
