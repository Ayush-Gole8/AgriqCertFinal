import { Request, Response } from 'express';
import { Inspection } from '../models/Inspection.js';
import { Batch } from '../models/Batch.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

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
    
    console.log('Creating inspection for batch:', batchId);
    console.log('Inspection data received:', JSON.stringify(inspectionData, null, 2));

    // Check if batch exists and is submitted
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    if (batch.status !== 'submitted') {
      throw new AppError(400, 'Batch must be submitted before inspection can begin');
    }

    // Check if inspection already exists for this batch
    const existingInspection = await Inspection.findOne({ 
      batchId, 
      status: { $in: ['pending', 'in_progress'] },
      inspectorId: req.user.userId 
    });
    if (existingInspection) {
      console.log('Found existing inspection:', existingInspection.id);
      return res.status(200).json({
        success: true,
        message: 'Inspection already exists for this batch',
        data: { inspection: existingInspection },
      });
    }

    // Create inspection
    const inspection = await Inspection.create({
      ...inspectionData,
      batchId,
      inspectorId: req.user.userId,
      inspectorName: req.user.name,
      status: 'in_progress',
      startedAt: new Date(),
      geospatialData: inspectionData.geolocation ? {
        latitude: inspectionData.geolocation.latitude,
        longitude: inspectionData.geolocation.longitude,
        accuracy: inspectionData.geolocation.accuracy,
        timestamp: new Date(inspectionData.geolocation.timestamp),
        isoCode: 'US',
        region: 'California',
      } : undefined,
    });

    // Update batch status to inspecting
    await Batch.findByIdAndUpdate(batchId, { status: 'inspecting' });

    // Create notification for farmer
    await Notification.create({
      userId: batch.farmerId,
      type: 'inspection_complete',
      title: 'Inspection Started',
      message: `Quality inspection has begun for your batch ${batch.productName} (${batch.id}).`,
      actionUrl: `/batches/${batchId}`,
    });

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'INSPECTION_CREATED',
      resource: 'inspection',
      resourceId: inspection._id.toString(),
      details: { batchId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });

    res.status(201).json({
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
      inspectorId 
    } = req.query as any;

    // Build filter based on user role
    const filter: any = {};

    // QA Inspectors only see their own inspections
    if (req.user.role === 'qa_inspector') {
      filter.inspectorId = req.user.userId;
    }

    // Add additional filters
    if (status) filter.status = status;
    if (batchId) filter.batchId = batchId;
    if (inspectorId && req.user.role !== 'qa_inspector') filter.inspectorId = inspectorId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Inspection.countDocuments(filter);

    const inspections = await Inspection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('batchId', 'productName productType farmerName');

    res.status(200).json({
      success: true,
      data: {
        inspections,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
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

    const inspection = await Inspection.findById(id)
      .populate('batchId', 'productName productType farmerName farmerId location');

    if (!inspection) {
      throw new AppError(404, 'Inspection not found');
    }

    // Check access permissions
    const canAccess = 
      req.user.role === 'admin' ||
      (req.user.role === 'qa_inspector' && inspection.inspectorId === req.user.userId) ||
      (req.user.role === 'farmer' && (inspection as any).batchId?.farmerId === req.user.userId) ||
      ['certifier', 'verifier'].includes(req.user.role);

    if (!canAccess) {
      throw new AppError(403, 'Not authorized to view this inspection');
    }

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

    const inspection = await Inspection.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found');
    }

    // Only the assigned inspector can update their inspection
    if (req.user.role === 'qa_inspector' && inspection.inspectorId !== req.user.userId) {
      throw new AppError(403, 'Not authorized to update this inspection');
    }

    // Don't allow updates to completed inspections
    if (inspection.status === 'completed') {
      throw new AppError(400, 'Cannot update completed inspection');
    }

    // Update status to in_progress if it was pending
    if (inspection.status === 'pending') {
      updateData.status = 'in_progress';
    }

    const updatedInspection = await Inspection.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('batchId', 'productName productType farmerName');

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'INSPECTION_UPDATED',
      resource: 'inspection',
      resourceId: id,
      details: updateData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
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

    const inspection = await Inspection.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found');
    }

    // Only the assigned inspector can complete their inspection
    if (req.user.role === 'qa_inspector' && inspection.inspectorId !== req.user.userId) {
      throw new AppError(403, 'Not authorized to complete this inspection');
    }

    if (inspection.status === 'completed') {
      throw new AppError(400, 'Inspection already completed');
    }

    // Determine pass/fail from either overallResult or passed field
    const inspectionPassed = overallResult === 'pass' || passed === true;
    
    // Update inspection
    const updatedInspection = await Inspection.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        overallResult: overallResult || (inspectionPassed ? 'pass' : 'fail'),
        outcome: outcome || {
          classification: inspectionPassed ? 'pass' : 'fail',
          reasoning: inspectionPassed ? 'All quality parameters meet required standards' : 'One or more parameters failed',
          followUpRequired: !inspectionPassed,
          complianceNotes: comments || notes || ''
        },
        notes: notes || comments,
        readings: readings || inspection.readings,
        completedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    // Update batch status based on inspection result
    const newBatchStatus = inspectionPassed ? 'approved' : 'rejected';
    const batch = await Batch.findByIdAndUpdate(
      inspection.batchId,
      { status: newBatchStatus },
      { new: true }
    );

    if (batch) {
      // Create notification for farmer
      await Notification.create({
        userId: batch.farmerId,
        type: inspectionPassed ? 'batch_approved' : 'batch_rejected',
        title: `Inspection ${inspectionPassed ? 'Approved' : 'Rejected'}`,
        message: `Your batch ${batch.productName} (${batch.id}) has been ${inspectionPassed ? 'approved' : 'rejected'} after quality inspection.`,
        actionUrl: `/batches/${batch._id}`,
      });

      // Create notification for certifier if approved
      if (inspectionPassed) {
        // Note: In a real system, you'd have logic to assign certifiers
        // For now, we'll create a general notification
        await Notification.create({
          userId: 'system', // Replace with actual certifier assignment logic
          type: 'action_required',
          title: 'Batch Ready for Certification',
          message: `Batch ${batch.productName} (${batch.id}) has been approved and is ready for certification.`,
          actionUrl: `/batches/${batch._id}`,
        });
      }
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'INSPECTION_COMPLETED',
      resource: 'inspection',
      resourceId: id,
      details: { passed, batchId: inspection.batchId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
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

    const inspections = await Inspection.find({ batchId })
      .sort({ createdAt: -1 });

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

    const inspection = await Inspection.findById(id);
    if (!inspection) {
      throw new AppError(404, 'Inspection not found');
    }

    // Only the assigned inspector can save their inspection draft
    if (req.user.role === 'qa_inspector' && inspection.inspectorId !== req.user.userId) {
      throw new AppError(403, 'Not authorized to update this inspection');
    }

    // Don't allow draft saves for completed inspections
    if (inspection.status === 'completed') {
      throw new AppError(400, 'Cannot save draft for completed inspection');
    }

    // Update status to in_progress if it was pending
    if (inspection.status === 'pending') {
      draftData.status = 'in_progress';
    }

    // Save draft with timestamp
    draftData.draftSavedAt = new Date();

    const updatedInspection = await Inspection.findByIdAndUpdate(
      id,
      draftData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully',
      data: { 
        inspection: updatedInspection,
        savedAt: draftData.draftSavedAt 
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

    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // Default validation rules based on product type
    const rules = {
      grains: {
        maxMoisturePercent: 14,
        maxPesticidePPM: 0.1,
        requiresOrganic: false,
        temperatureRange: { min: 10, max: 25 },
        requiredPhotos: ['sample', 'storage_conditions'],
        requiredReadings: ['moisture', 'temperature', 'visual_inspection']
      },
      fruits: {
        maxMoisturePercent: 85,
        maxPesticidePPM: 0.05,
        requiresOrganic: true,
        temperatureRange: { min: 2, max: 8 },
        requiredPhotos: ['fruit_quality', 'packaging'],
        requiredReadings: ['brix', 'firmness', 'color', 'visual_inspection']
      },
      vegetables: {
        maxMoisturePercent: 90,
        maxPesticidePPM: 0.1,
        requiresOrganic: false,
        temperatureRange: { min: 0, max: 10 },
        requiredPhotos: ['vegetable_quality', 'freshness'],
        requiredReadings: ['freshness', 'size', 'visual_inspection']
      },
      organic: {
        maxMoisturePercent: 15,
        maxPesticidePPM: 0,
        requiresOrganic: true,
        temperatureRange: { min: 10, max: 20 },
        requiredPhotos: ['organic_certification', 'sample'],
        requiredReadings: ['organic_verification', 'visual_inspection']
      }
    };

    const productTypeRules = rules[batch.productType as keyof typeof rules] || rules.grains;

    res.status(200).json({
      success: true,
      data: {
        rules: productTypeRules,
        batchInfo: {
          productType: batch.productType,
          productName: batch.productName,
          isOrganic: Array.isArray((batch as any).metadata?.certificationStandards)
            ? (batch as any).metadata.certificationStandards.includes('organic')
            : false
        }
      },
    });
  });
}