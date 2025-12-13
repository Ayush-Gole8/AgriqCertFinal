import crypto from 'crypto';
import config from '../config/index.js';
import database from '../config/database.js';
import { IssuanceJob, Batch, Inspection, Certificate, Notification } from '../models/index.js';
import { injiClient } from '../services/injiClient.js';
import type { VCPayload } from '../services/injiClient.js';

class IssuanceWorker {
  private isRunning = false;
  private pollInterval: number;
  private maxConcurrency: number;
  private activeJobs = new Set<string>();
  private readonly workerId: string;

  constructor() {
    this.pollInterval = config.worker.pollIntervalMs;
    this.maxConcurrency = config.worker.concurrency;
    this.workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[IssuanceWorker] Already running');
      return;
    }

    console.log(`[IssuanceWorker] Starting with poll interval: ${this.pollInterval}ms, concurrency: ${this.maxConcurrency}`);
    
    // Ensure database connection
    await database.connect();
    
    this.isRunning = true;
    this.poll();
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    console.log('[IssuanceWorker] Stopping...');
    this.isRunning = false;

    // Wait for active jobs to complete
    while (this.activeJobs.size > 0) {
      console.log(`[IssuanceWorker] Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('[IssuanceWorker] Stopped');
  }

  /**
   * Main polling loop
   */
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processJobs();
      } catch (error) {
        console.error('[IssuanceWorker] Error in poll cycle:', error);
      }

      if (this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  /**
   * Process pending jobs
   */
  private async processJobs(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrency) {
      return;
    }

    const availableSlots = this.maxConcurrency - this.activeJobs.size;
    const pendingJobs = await (IssuanceJob as any).findPendingJobs(availableSlots);

    if (pendingJobs.length === 0) {
      return;
    }

    console.log(`[IssuanceWorker] Found ${pendingJobs.length} pending jobs`);

    // Process jobs concurrently
    const promises = pendingJobs.map((job: any) => this.processJob(job.id));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single job
   */
  private async processJob(jobId: string): Promise<void> {
    if (this.activeJobs.has(jobId)) {
      return;
    }

    this.activeJobs.add(jobId);

    try {
      // Claim the job atomically
      const job = await (IssuanceJob as any).claimJob(jobId, this.workerId);
      if (!job) {
        console.log(`[IssuanceWorker] Job ${jobId} already claimed or processed`);
        return;
      }

      console.log(`[IssuanceWorker] Processing job ${jobId} for batch ${job.batchId}`);

      // Get batch and inspection data
      const batch = await Batch.findById(job.batchId).populate('farmerId', 'name email');
      if (!batch) {
        throw new Error(`Batch ${job.batchId} not found`);
      }

      const inspection = job.inspectionId 
        ? await Inspection.findById(job.inspectionId).populate('inspectorId', 'name email')
        : null;

      // Build credential payload
      const payload = this.buildCredentialPayload(batch, inspection);

      // Issue VC through Inji client
      const result = await injiClient.issueVC(payload);

      // Compute VC hash
      const vcHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(result.vcJson))
        .digest('hex');

      // Create Certificate document
      const certificate = await Certificate.create({
        batchId: batch.id,
        vc: result.vcJson,
        providerVcId: result.vcId,
        vcUrl: result.vcUrl,
        vcHash,
        qrCodeData: JSON.stringify({
          type: 'AgriQCert_Certificate',
          id: result.vcId,
          url: result.vcUrl,
          hash: vcHash,
        }),
        issuedBy: inspection?.inspectorId || batch.farmerId,
        expiresAt: new Date(Date.now() + config.vc.defaultExpiryDays * 24 * 60 * 60 * 1000),
        metadata: {
          jobId: job.id,
          issuanceMethod: 'inji',
          processingTime: Date.now() - job.createdAt.getTime(),
        },
      });

      // Mark job as successful
      await (IssuanceJob as any).markSuccess(jobId, {
        vcId: result.vcId,
        vcUrl: result.vcUrl,
        certificateId: certificate.id,
      });

      // Update batch status if needed
      if (batch.status === 'approved') {
        batch.status = 'certified';
        batch.certifiedAt = new Date();
        await batch.save();
      }

      // Create notification
      await this.createNotification(batch, certificate);

      console.log(`[IssuanceWorker] Successfully processed job ${jobId}, created certificate ${certificate.id}`);

    } catch (error) {
      console.error(`[IssuanceWorker] Job ${jobId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Get current job to check attempt count
      const currentJob = await IssuanceJob.findById(jobId);
      if (currentJob && currentJob.attempts >= 3) {
        // Max attempts reached, mark as failed
        await (IssuanceJob as any).markFailed(jobId, errorMessage);
      } else {
        // Requeue for retry
        await (IssuanceJob as any).requeueJob(jobId, errorMessage);
      }
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Build credential payload from batch and inspection data
   */
  private buildCredentialPayload(batch: any, inspection: any): VCPayload {
    const credentialSubject: Record<string, any> = {
      id: `did:agriqcert:batch:${batch.id}`,
      batchId: batch.id,
      productType: batch.productType,
      productName: batch.productName,
      quantity: batch.quantity,
      unit: batch.unit,
      harvestDate: batch.harvestDate,
      farmer: {
        id: batch.farmerId,
        name: batch.farmerName,
        organization: batch.farmerOrganization,
      },
      location: batch.location,
      traceabilityInfo: {
        farmId: batch.farmerId,
        batchNumber: batch.id,
        harvestSeason: this.getHarvestSeason(batch.harvestDate),
      },
    };

    if (inspection) {
      credentialSubject.inspection = {
        id: inspection.id,
        inspector: {
          id: inspection.inspectorId,
          name: inspection.inspectorName,
        },
        inspectedAt: inspection.inspectedAt,
        completedAt: inspection.completedAt,
        status: inspection.status,
        outcome: inspection.outcome,
        qualityGrade: inspection.qualityGrade,
        readings: inspection.readings,
        notes: inspection.notes,
        overallScore: inspection.overallScore,
      };
    }

    return {
      credentialSubject,
      type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://schemas.agriqcert.com/v1',
      ],
      issuer: config.inji.issuerDid,
      expirationDate: new Date(Date.now() + config.vc.defaultExpiryDays * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Create notification for successful issuance
   */
  private async createNotification(batch: any, certificate: any): Promise<void> {
    try {
      await Notification.create({
        userId: batch.farmerId,
        type: 'certificate_issued',
        title: 'Certificate Issued',
        message: `Your certificate for batch ${batch.id} (${batch.productName}) has been successfully issued.`,
        data: {
          batchId: batch.id,
          certificateId: certificate.id,
          productName: batch.productName,
        },
        priority: 'high',
      });
    } catch (error) {
      console.error('[IssuanceWorker] Failed to create notification:', error);
      // Don't fail the job for notification errors
    }
  }

  /**
   * Get harvest season from date
   */
  private getHarvestSeason(harvestDate: Date): string {
    const month = harvestDate.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      maxConcurrency: this.maxConcurrency,
      pollInterval: this.pollInterval,
    };
  }
}

// Create singleton instance
export const issuanceWorker = new IssuanceWorker();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[IssuanceWorker] Received SIGTERM, shutting down gracefully...');
  await issuanceWorker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[IssuanceWorker] Received SIGINT, shutting down gracefully...');
  await issuanceWorker.stop();
  process.exit(0);
});

// Auto-start if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[IssuanceWorker] Starting worker process...');
  issuanceWorker.start().catch((error) => {
    console.error('[IssuanceWorker] Failed to start:', error);
    process.exit(1);
  });
}

export default IssuanceWorker;