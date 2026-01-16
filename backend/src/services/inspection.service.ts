import { Inspection } from '../models/inspection.model.js';
import { Batch } from '../models/batch.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { Notification } from '../models/notification.model.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { PaginatedResponse, UserRole } from '../types/index.js';

interface AuthUser {
    userId: string;
    name: string;
    role: UserRole;
}

interface CreateInspectionInput {
    batchId: string;
    inspectionData: any;
    user: AuthUser;
    ipAddress?: string;
    userAgent?: string | null;
}

interface GetInspectionsInput {
    user: AuthUser;
    page?: number | string;
    limit?: number | string;
    status?: string;
    batchId?: string;
    inspectorId?: string;
}

interface GetInspectionByIdInput {
    id: string;
    user: AuthUser;
}

interface UpdateInspectionInput {
    id: string;
    updateData: any;
    user: AuthUser;
    ipAddress?: string;
    userAgent?: string | null;
}

interface CompleteInspectionInput {
    id: string;
    payload: {
        passed?: boolean;
        comments?: string;
        readings?: any;
        overallResult?: string;
        outcome?: any;
        notes?: string;
    };
    user: AuthUser;
    ipAddress?: string;
    userAgent?: string | null;
}

interface SaveDraftInput {
    id: string;
    draftData: any;
    user: AuthUser;
}

interface GetValidationRulesInput {
    batchId: string;
}

export class InspectionService {
    static async createInspection(
        input: CreateInspectionInput
    ): Promise<{ inspection: any; alreadyExists: boolean }> {
        const { batchId, inspectionData, user, ipAddress, userAgent } = input;

        console.log('Creating inspection for batch:', batchId);
        console.log('Inspection data received:', JSON.stringify(inspectionData, null, 2));

        const batch = await Batch.findById(batchId);
        if (!batch) {
            throw new AppError(404, 'Batch not found');
        }

        if (batch.status !== 'submitted') {
            throw new AppError(400, 'Batch must be submitted before inspection can begin');
        }

        const existingInspection = await Inspection.findOne({
            batchId,
            status: { $in: ['pending', 'in_progress'] },
            inspectorId: user.userId,
        });

        if (existingInspection) {
            console.log('Found existing inspection:', existingInspection.id);
            return { inspection: existingInspection, alreadyExists: true };
        }

        const inspection = await Inspection.create({
            ...inspectionData,
            batchId,
            inspectorId: user.userId,
            inspectorName: user.name,
            status: 'in_progress',
            startedAt: new Date(),
            geospatialData: inspectionData.geolocation
                ? {
                    latitude: inspectionData.geolocation.latitude,
                    longitude: inspectionData.geolocation.longitude,
                    accuracy: inspectionData.geolocation.accuracy,
                    timestamp: new Date(inspectionData.geolocation.timestamp),
                    isoCode: 'US',
                    region: 'California',
                }
                : undefined,
        });

        await Batch.findByIdAndUpdate(batchId, { status: 'inspecting' });

        await Notification.create({
            userId: batch.farmerId,
            type: 'inspection_complete',
            title: 'Inspection Started',
            message: `Quality inspection has begun for your batch ${batch.productName} (${batch.id}).`,
            actionUrl: `/batches/${batchId}`,
        });

        await AuditLog.create({
            userId: user.userId,
            userName: user.name,
            action: 'INSPECTION_CREATED',
            resource: 'inspection',
            resourceId: inspection._id.toString(),
            details: { batchId },
            ipAddress,
            userAgent: userAgent ?? undefined,
            timestamp: new Date(),
        });

        return { inspection, alreadyExists: false };
    }

    static async getInspections(
        input: GetInspectionsInput
    ): Promise<PaginatedResponse<any>> {
        const { user, page = 1, limit = 10, status, batchId, inspectorId } = input;

        const filter: any = {};

        if (user.role === 'qa_inspector') {
            filter.inspectorId = user.userId;
        }

        if (status) filter.status = status;
        if (batchId) filter.batchId = batchId;
        if (inspectorId && user.role !== 'qa_inspector') filter.inspectorId = inspectorId;

        const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
        const limitNumber = typeof limit === 'string' ? parseInt(limit, 10) : limit;
        const skip = (pageNumber - 1) * limitNumber;

        const total = await Inspection.countDocuments(filter);

        const inspections = await Inspection.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate('batchId', 'productName productType farmerName');

        return {
            data: inspections,
            total,
            page: pageNumber,
            pageSize: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        };
    }

    static async getInspectionById(input: GetInspectionByIdInput) {
        const { id, user } = input;

        const inspection = await Inspection.findById(id).populate(
            'batchId',
            'productName productType farmerName farmerId location'
        );

        if (!inspection) {
            throw new AppError(404, 'Inspection not found');
        }

        const canAccess =
            user.role === 'admin' ||
            (user.role === 'qa_inspector' && inspection.inspectorId === user.userId) ||
            (user.role === 'farmer' && (inspection as any).batchId?.farmerId === user.userId) ||
            ['certifier', 'verifier'].includes(user.role);

        if (!canAccess) {
            throw new AppError(403, 'Not authorized to view this inspection');
        }

        return inspection;
    }

    static async updateInspection(input: UpdateInspectionInput) {
        const { id, updateData, user, ipAddress, userAgent } = input;

        const inspection = await Inspection.findById(id);
        if (!inspection) {
            throw new AppError(404, 'Inspection not found');
        }

        if (user.role === 'qa_inspector' && inspection.inspectorId !== user.userId) {
            throw new AppError(403, 'Not authorized to update this inspection');
        }

        if (inspection.status === 'completed') {
            throw new AppError(400, 'Cannot update completed inspection');
        }

        if (inspection.status === 'pending') {
            updateData.status = 'in_progress';
        }

        const updatedInspection = await Inspection.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate('batchId', 'productName productType farmerName');

        await AuditLog.create({
            userId: user.userId,
            userName: user.name,
            action: 'INSPECTION_UPDATED',
            resource: 'inspection',
            resourceId: id,
            details: updateData,
            ipAddress,
            userAgent: userAgent ?? undefined,
            timestamp: new Date(),
        });

        return updatedInspection;
    }

    static async completeInspection(input: CompleteInspectionInput) {
        const { id, payload, user, ipAddress, userAgent } = input;
        const { passed, comments, readings, overallResult, outcome, notes } = payload;

        const inspection = await Inspection.findById(id);
        if (!inspection) {
            throw new AppError(404, 'Inspection not found');
        }

        if (user.role === 'qa_inspector' && inspection.inspectorId !== user.userId) {
            throw new AppError(403, 'Not authorized to complete this inspection');
        }

        if (inspection.status === 'completed') {
            throw new AppError(400, 'Inspection already completed');
        }

        const inspectionPassed =
            overallResult === 'pass' || passed === true;

        const updatedInspection = await Inspection.findByIdAndUpdate(
            id,
            {
                status: 'completed',
                overallResult: overallResult || (inspectionPassed ? 'pass' : 'fail'),
                outcome:
                    outcome || {
                        classification: inspectionPassed ? 'pass' : 'fail',
                        reasoning: inspectionPassed
                            ? 'All quality parameters meet required standards'
                            : 'One or more parameters failed',
                        followUpRequired: !inspectionPassed,
                        complianceNotes: comments || notes || '',
                    },
                notes: notes || comments,
                readings: readings || inspection.readings,
                completedAt: new Date(),
            },
            { new: true, runValidators: true }
        );

        const newBatchStatus = inspectionPassed ? 'approved' : 'rejected';
        const batch = await Batch.findByIdAndUpdate(
            inspection.batchId,
            { status: newBatchStatus },
            { new: true }
        );

        if (batch) {
            await Notification.create({
                userId: batch.farmerId,
                type: inspectionPassed ? 'batch_approved' : 'batch_rejected',
                title: `Inspection ${inspectionPassed ? 'Approved' : 'Rejected'}`,
                message: `Your batch ${batch.productName} (${batch.id}) has been ${inspectionPassed ? 'approved' : 'rejected'
                    } after quality inspection.`,
                actionUrl: `/batches/${batch._id}`,
            });

            if (inspectionPassed) {
                await Notification.create({
                    userId: 'system',
                    type: 'action_required',
                    title: 'Batch Ready for Certification',
                    message: `Batch ${batch.productName} (${batch.id}) has been approved and is ready for certification.`,
                    actionUrl: `/batches/${batch._id}`,
                });
            }
        }

        await AuditLog.create({
            userId: user.userId,
            userName: user.name,
            action: 'INSPECTION_COMPLETED',
            resource: 'inspection',
            resourceId: id,
            details: { passed, batchId: inspection.batchId },
            ipAddress,
            userAgent: userAgent ?? undefined,
            timestamp: new Date(),
        });

        return updatedInspection;
    }

    static async getInspectionsByBatch(batchId: string) {
        const inspections = await Inspection.find({ batchId }).sort({ createdAt: -1 });
        return inspections;
    }

    static async saveDraft(input: SaveDraftInput) {
        const { id, draftData, user } = input;

        const inspection = await Inspection.findById(id);
        if (!inspection) {
            throw new AppError(404, 'Inspection not found');
        }

        if (user.role === 'qa_inspector' && inspection.inspectorId !== user.userId) {
            throw new AppError(403, 'Not authorized to update this inspection');
        }

        if (inspection.status === 'completed') {
            throw new AppError(400, 'Cannot save draft for completed inspection');
        }

        if (inspection.status === 'pending') {
            draftData.status = 'in_progress';
        }

        draftData.draftSavedAt = new Date();

        const updatedInspection = await Inspection.findByIdAndUpdate(
            id,
            draftData,
            { new: true, runValidators: true }
        );

        return {
            inspection: updatedInspection,
            savedAt: draftData.draftSavedAt,
        };
    }

    static async getValidationRules(input: GetValidationRulesInput) {
        const { batchId } = input;

        const batch = await Batch.findById(batchId);
        if (!batch) {
            throw new AppError(404, 'Batch not found');
        }

        const rules = {
            grains: {
                maxMoisturePercent: 14,
                maxPesticidePPM: 0.1,
                requiresOrganic: false,
                temperatureRange: { min: 10, max: 25 },
                requiredPhotos: ['sample', 'storage_conditions'],
                requiredReadings: ['moisture', 'temperature', 'visual_inspection'],
            },
            fruits: {
                maxMoisturePercent: 85,
                maxPesticidePPM: 0.05,
                requiresOrganic: true,
                temperatureRange: { min: 2, max: 8 },
                requiredPhotos: ['fruit_quality', 'packaging'],
                requiredReadings: ['brix', 'firmness', 'color', 'visual_inspection'],
            },
            vegetables: {
                maxMoisturePercent: 90,
                maxPesticidePPM: 0.1,
                requiresOrganic: false,
                temperatureRange: { min: 0, max: 10 },
                requiredPhotos: ['vegetable_quality', 'freshness'],
                requiredReadings: ['freshness', 'size', 'visual_inspection'],
            },
            organic: {
                maxMoisturePercent: 15,
                maxPesticidePPM: 0,
                requiresOrganic: true,
                temperatureRange: { min: 10, max: 20 },
                requiredPhotos: ['organic_certification', 'sample'],
                requiredReadings: ['organic_verification', 'visual_inspection'],
            },
        } as const;

        const productTypeRules =
            rules[(batch as any).productType as keyof typeof rules] || rules.grains;

        return {
            rules: productTypeRules,
            batchInfo: {
                productType: (batch as any).productType,
                productName: (batch as any).productName,
                isOrganic: Array.isArray((batch as any).metadata?.certificationStandards)
                    ? (batch as any).metadata.certificationStandards.includes('organic')
                    : false,
            },
        };
    }
}

export default InspectionService;

