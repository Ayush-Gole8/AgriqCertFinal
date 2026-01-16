import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { IssuanceJob } from '../src/models/issuanceJob.model.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('IssuanceJob Model', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should create an issuance job', async () => {
    const jobData = {
      certificateId: new mongoose.Types.ObjectId(),
      batchId: 'BATCH-2024-001',
      inspectionId: new mongoose.Types.ObjectId(),
      priority: 1,
    };

    const job = new IssuanceJob(jobData);
    await job.save();

    expect(job.status).toBe('pending');
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(3);
    expect(job.createdAt).toBeInstanceOf(Date);
  });

  it('should find pending jobs', async () => {
    // Create some test jobs
    const job1 = new IssuanceJob({
      certificateId: new mongoose.Types.ObjectId(),
      batchId: 'BATCH-2024-002',
      priority: 1,
      status: 'pending'
    });

    const job2 = new IssuanceJob({
      certificateId: new mongoose.Types.ObjectId(),
      batchId: 'BATCH-2024-003',
      priority: 2,
      status: 'processing'
    });

    await Promise.all([job1.save(), job2.save()]);

    const pendingJobs = await (IssuanceJob as any).findPendingJobs();

    expect(pendingJobs.length).toBeGreaterThan(0);
    expect(pendingJobs.every((job: any) => job.status === 'pending')).toBe(true);
  });

  it('should claim jobs atomically', async () => {
    const job = new IssuanceJob({
      certificateId: new mongoose.Types.ObjectId(),
      batchId: 'BATCH-2024-004',
      priority: 1,
      status: 'pending'
    });
    await job.save();

    const claimedJob = await (IssuanceJob as any).claimJob(job._id, 'worker-1');

    expect(claimedJob?.status).toBe('processing');
    expect(claimedJob?.workerId).toBe('worker-1');

    // Try to claim the same job again - should fail
    const secondClaim = await (IssuanceJob as any).claimJob(job._id, 'worker-2');
    expect(secondClaim).toBeNull();
  });
});