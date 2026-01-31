import { Batch } from '../models/batch.model.js';
import { Notification } from '../models/notification.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { PaginatedResponse, UserRole } from '../types/index.js';

interface AuthUser {
  userId: string;
  name: string;
  role: UserRole;
}

interface CreateBatchInput {
  data: {
    // Basic/Identity
    farmerName?: string;
    contactPhone?: string;
    contactEmail?: string;
    
    // Farm & Origin
    farmAddress?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    farmGeoPoint?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      altitude?: number;
    };
    landAreaHa?: number;
    
    // Crop & Batch
    crop: string;
    variety?: string;
    plantingDate?: Date;
    harvestDate: Date;
    lotNumber?: string;
    quantityNetKg: number;
    packagingType?: string;
    numPackages?: number;
    
    // Quality & Lab
    inspectionDate?: Date;
    inspectorId?: string;
    inspectorName?: string;
    inspectionResult?: 'pending' | 'passed' | 'failed' | 'requires_retest';
    moisturePercent?: number;
    foreignMatterPercent?: number;
    brokenGrainPercent?: number;
    labTestId?: string;
    labReportUrl?: string;
    
    // Compliance & Trade
    hsCode?: string;
    destinationCountry?: string;
    portOfLoading?: string;
    incoterm?: string;
    
    // Attachments
    photos?: Array<{
      url: string;
      caption?: string;
      takenAt?: Date;
      fileSize?: number;
      mimeType?: string;
    }>;
    labReportPdf?: string;
    
    // Declarations
    farmerDeclaration: boolean;
    signatureFarmer?: string;
    dataProvenance: {
      source: string;
      collectedBy: string;
      collectedAt: Date;
      gpsSource?: string;
      deviceInfo?: string;
    };
    
    // Legacy fields for compatibility
    productType?: string;
    productName?: string;
    quantity?: number;
    unit?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
      region?: string;
    };
  };
  user: AuthUser;
  ipAddress?: string;
  userAgent?: string | null;
}

interface GetBatchesInput {
  user: AuthUser;
  page?: number | string;
  limit?: number | string;
  sort?: string;
  order?: 'asc' | 'desc' | string;
  status?: string;
  productType?: string;
  search?: string;
}

interface GetBatchByIdInput {
  id: string;
  user?: AuthUser;
}

interface UpdateBatchInput {
  id: string;
  payload: {
    // Basic/Identity
    farmerName?: string;
    contactPhone?: string;
    contactEmail?: string;
    
    // Farm & Origin
    farmAddress?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    farmGeoPoint?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      altitude?: number;
    };
    landAreaHa?: number;
    
    // Crop & Batch
    crop?: string;
    variety?: string;
    plantingDate?: Date;
    harvestDate?: Date;
    lotNumber?: string;
    quantityNetKg?: number;
    packagingType?: string;
    numPackages?: number;
    
    // Quality & Lab
    inspectionDate?: Date;
    inspectorId?: string;
    inspectorName?: string;
    inspectionResult?: 'pending' | 'passed' | 'failed' | 'requires_retest';
    moisturePercent?: number;
    foreignMatterPercent?: number;
    brokenGrainPercent?: number;
    labTestId?: string;
    labReportUrl?: string;
    
    // Compliance & Trade
    hsCode?: string;
    destinationCountry?: string;
    portOfLoading?: string;
    incoterm?: string;
    
    // Attachments
    photos?: Array<{
      url: string;
      caption?: string;
      takenAt?: Date;
      fileSize?: number;
      mimeType?: string;
    }>;
    labReportPdf?: string;
    
    // Declarations
    farmerDeclaration?: boolean;
    signatureFarmer?: string;
    dataProvenance?: {
      source: string;
      collectedBy: string;
      collectedAt: Date;
      gpsSource?: string;
      deviceInfo?: string;
    };
    
    // Legacy fields
    productType?: string;
    productName?: string;
    quantity?: number;
    unit?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
      region?: string;
    };
    
    // Status fields
    status?: string;
  };
  user: AuthUser;
  ipAddress?: string;
  userAgent?: string | null;
}

interface SubmitBatchInput {
  id: string;
  user: AuthUser;
  ipAddress?: string;
  userAgent?: string | null;
}

interface DeleteBatchInput {
  id: string;
  user: AuthUser;
  ipAddress?: string;
  userAgent?: string | null;
}

interface GetBatchStatsInput {
  user: AuthUser;
}

export class BatchService {
  static async createBatch(input: CreateBatchInput) {
    // Extract legacy fields for backward compatibility
    const {
      productType,
      productName,
      quantity,
      unit,
      location,
      ...rest
    } = input.data;

    // Auto-generate batch ID if not provided
    const batchId = await this.generateBatchId();

    // Construct comprehensive batch data
    const batchData = {
      // Legacy fields for compatibility
      productType: productType || rest.crop,
      productName: productName || `${rest.crop} - ${rest.variety || 'Standard'}`,
      quantity: quantity || rest.quantityNetKg,
      unit: unit || 'kg',
      location: location || (rest.farmGeoPoint && {
        latitude: rest.farmGeoPoint.latitude,
        longitude: rest.farmGeoPoint.longitude,
        address: rest.farmAddress ? 
          `${rest.farmAddress.street}, ${rest.farmAddress.city}, ${rest.farmAddress.state}` : 
          undefined
      }),
      
      // Standard fields
      farmerId: input.user.userId,
      farmerName: rest.farmerName || input.user.name,
      status: 'draft',
      
      // Comprehensive metadata
      batchMetadata: {
        batchId,
        
        // Basic/Identity
        farmerId: input.user.userId,
        farmerName: rest.farmerName || input.user.name,
        contactPhone: rest.contactPhone,
        contactEmail: rest.contactEmail,
        
        // Farm & Origin
        farmAddress: rest.farmAddress,
        farmGeoPoint: rest.farmGeoPoint,
        landAreaHa: rest.landAreaHa,
        
        // Crop & Batch
        crop: rest.crop,
        variety: rest.variety,
        plantingDate: rest.plantingDate,
        harvestDate: rest.harvestDate,
        lotNumber: rest.lotNumber,
        quantityNetKg: rest.quantityNetKg,
        packagingType: rest.packagingType,
        numPackages: rest.numPackages,
        
        // Quality & Lab
        inspectionDate: rest.inspectionDate,
        inspectorId: rest.inspectorId,
        inspectorName: rest.inspectorName,
        inspectionResult: rest.inspectionResult || 'pending',
        moisturePercent: rest.moisturePercent,
        foreignMatterPercent: rest.foreignMatterPercent,
        brokenGrainPercent: rest.brokenGrainPercent,
        labTestId: rest.labTestId,
        labReportUrl: rest.labReportUrl,
        
        // Compliance & Trade
        hsCode: rest.hsCode,
        destinationCountry: rest.destinationCountry,
        portOfLoading: rest.portOfLoading,
        incoterm: rest.incoterm,
        
        // Attachments
        photos: rest.photos || [],
        labReportPdf: rest.labReportPdf,
        
        // Declarations
        farmerDeclaration: rest.farmerDeclaration,
        signatureFarmer: rest.signatureFarmer,
        dataProvenance: rest.dataProvenance || {
          source: 'farmer_portal',
          collectedBy: input.user.name,
          collectedAt: new Date(),
          deviceInfo: input.userAgent || 'unknown'
        }
      }
    };

    const batch = await Batch.create(batchData);

    await AuditLog.create({
      userId: input.user.userId,
      userName: input.user.name,
      action: 'BATCH_CREATED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      details: { batchId },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ?? undefined,
      timestamp: new Date(),
    });

    return batch;
  }

  private static async generateBatchId(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `AGQC-${dateStr}-REG-`;
    
    // Find the highest sequence number for today
    const lastBatch = await Batch.findOne({
      'batchMetadata.batchId': { $regex: `^${prefix}` }
    }).sort({ 'batchMetadata.batchId': -1 });
    
    let sequence = 1;
    if (lastBatch?.batchMetadata?.batchId) {
      const match = lastBatch.batchMetadata.batchId.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }
    
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  static async getBatches(input: GetBatchesInput): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      status,
      productType,
      search,
    } = input;

    const query: any = {};

    if (input.user.role === 'farmer') {
      query.farmerId = input.user.userId;
    }

    if (status) query.status = status;
    if (productType) query.productType = productType;

    if (search) {
      query.$text = { $search: search };
    }

    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNumber = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    const skip = (pageNumber - 1) * limitNumber;
    const sortOrder = order === 'desc' ? -1 : 1;

    const [batches, total] = await Promise.all([
      Batch.find(query)
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Batch.countDocuments(query),
    ]);

    return {
      data: batches,
      total,
      page: pageNumber,
      pageSize: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  static async getBatchById(input: GetBatchByIdInput) {
    const batch = await Batch.findById(input.id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    if (
      input.user &&
      input.user.role === 'farmer' &&
      batch.farmerId !== input.user.userId
    ) {
      throw new AppError(403, 'Access denied');
    }

    return batch;
  }

  static async updateBatch(input: UpdateBatchInput) {
    const batch = await Batch.findById(input.id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    if (
      input.user.role === 'farmer' &&
      batch.farmerId !== input.user.userId
    ) {
      throw new AppError(403, 'Access denied');
    }

    if (input.user.role === 'farmer' && batch.status !== 'draft') {
      throw new AppError(400, 'Cannot edit submitted batch');
    }

    // Extract legacy fields and metadata updates
    const {
      productType,
      productName,
      quantity,
      unit,
      location,
      status,
      ...metadataUpdates
    } = input.payload;

    // Update legacy fields if provided
    const updates: any = {};
    if (productType !== undefined) updates.productType = productType;
    if (productName !== undefined) updates.productName = productName;
    if (quantity !== undefined) updates.quantity = quantity;
    if (unit !== undefined) updates.unit = unit;
    if (location !== undefined) updates.location = location;
    if (status !== undefined) updates.status = status;

    // Update metadata fields
    if (Object.keys(metadataUpdates).length > 0) {
      const currentMetadata = batch.batchMetadata || {};
      updates.batchMetadata = {
        ...currentMetadata,
        ...metadataUpdates,
        // Update legacy compatibility fields in metadata
        ...(productType && { crop: productType }),
        ...(quantity && { quantityNetKg: quantity }),
      };
    }

    // Apply updates
    Object.assign(batch, updates);
    await batch.save();

    await AuditLog.create({
      userId: input.user.userId,
      userName: input.user.name,
      action: 'BATCH_UPDATED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      details: { 
        updatedFields: Object.keys(input.payload),
        hasMetadataUpdate: Object.keys(metadataUpdates).length > 0
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ?? undefined,
      timestamp: new Date(),
    });

    return batch;
  }

  static async submitBatch(input: SubmitBatchInput) {
    const batch = await Batch.findById(input.id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    if (batch.farmerId !== input.user.userId) {
      throw new AppError(403, 'Access denied');
    }

    if (batch.status !== 'draft') {
      throw new AppError(400, 'Batch already submitted');
    }

    batch.status = 'submitted';
    batch.submittedAt = new Date();
    await batch.save();

    await Notification.create({
      userId: input.user.userId,
      type: 'batch_submitted',
      title: 'New Batch Submitted',
      message: `Batch ${batch.productName} has been submitted for inspection`,
      read: false,
      actionUrl: `/batches/${batch._id}`,
    });

    await AuditLog.create({
      userId: input.user.userId,
      userName: input.user.name,
      action: 'BATCH_SUBMITTED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ?? undefined,
      timestamp: new Date(),
    });

    return batch;
  }

  static async deleteBatch(input: DeleteBatchInput) {
    const batch = await Batch.findById(input.id);

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    if (
      input.user.role !== 'admin' &&
      batch.farmerId !== input.user.userId
    ) {
      throw new AppError(403, 'Access denied');
    }

    if (batch.status !== 'draft') {
      throw new AppError(400, 'Cannot delete submitted batch');
    }

    await batch.deleteOne();

    await AuditLog.create({
      userId: input.user.userId,
      userName: input.user.name,
      action: 'BATCH_DELETED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ?? undefined,
      timestamp: new Date(),
    });
  }

  static async getBatchStats(input: GetBatchStatsInput) {
    const query: any = {};

    if (input.user.role === 'farmer') {
      query.farmerId = input.user.userId;
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

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    return {
      total,
      byStatus: statsMap,
    };
  }
}

export default BatchService;
