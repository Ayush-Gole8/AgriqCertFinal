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
  data: any;
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
  payload: any;
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
    const batchData = {
      ...input.data,
      farmerId: input.user.userId,
      farmerName: input.user.name,
      status: 'draft',
    };

    const batch = await Batch.create(batchData);

    await AuditLog.create({
      userId: input.user.userId,
      userName: input.user.name,
      action: 'BATCH_CREATED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ?? undefined,
      timestamp: new Date(),
    });

    return batch;
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

    Object.assign(batch, input.payload);
    await batch.save();

    await AuditLog.create({
      userId: input.user.userId,
      userName: input.user.name,
      action: 'BATCH_UPDATED',
      resource: 'batch',
      resourceId: batch._id.toString(),
      details: { updatedFields: Object.keys(input.payload) },
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
