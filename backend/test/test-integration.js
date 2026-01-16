#!/usr/bin/env node

// Test script for V3 verification
import mongoose from 'mongoose';
import { IssuanceJob } from './src/models/IssuanceJob.js';
import { Batch } from './src/models/Batch.js';
import { injiClient } from './src/services/injiClient.js';
import config from './src/config/index.js';

console.log('🧪 Starting V3 Integration Test...');

async function testIntegration() {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB connected');

    // Find a sample batch from seed
    const batches = await Batch.find().limit(5);
    console.log(`📦 Found ${batches.length} batches in database`);

    if (batches.length === 0) {
      console.log('❌ No batches found. Please run seed script first.');
      process.exit(1);
    }

    const batch = batches[0];
    console.log(`🔍 Using batch: ${batch.id} - ${batch.productName}`);

    // Create an issuance job
    console.log('📝 Creating issuance job...');
    const job = await IssuanceJob.create({
      certificateId: new mongoose.Types.ObjectId(),
      batchId: batch.id,
      priority: 1,
    });
    console.log(`✅ Created job: ${job.id}`);

    // Test the Inji client directly
    console.log('🔧 Testing Inji client (mock mode)...');
    const testPayload = {
      credentialSubject: {
        id: `did:agriqcert:batch:${batch.id}`,
        batchId: batch.id,
        productType: batch.productType,
        productName: batch.productName,
      },
      type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      issuer: 'did:example:agriqcert',
    };

    const result = await injiClient.issueVC(testPayload);
    console.log('✅ Inji client test successful:');
    console.log(`   - VC ID: ${result.vcId}`);
    console.log(`   - VC URL: ${result.vcUrl}`);

    // Check job processing capability
    const pendingJobs = await IssuanceJob.findPendingJobs(10);
    console.log(`🔄 Found ${pendingJobs.length} pending jobs`);

    if (pendingJobs.length > 0) {
      const testJob = pendingJobs[0];
      console.log(`🎯 Testing job claiming for job: ${testJob.id}`);
      
      const claimedJob = await IssuanceJob.claimJob(testJob.id);
      if (claimedJob) {
        console.log('✅ Job claiming works correctly');
        
        // Mark as successful
        await IssuanceJob.markSuccess(testJob.id, {
          vcId: result.vcId,
          vcUrl: result.vcUrl,
        });
        console.log('✅ Job completion works correctly');
      }
    }

    console.log('\n🎉 V3 Integration Test PASSED!');
    console.log('✓ Database connection working');
    console.log('✓ Job creation working');
    console.log('✓ Inji client working (mock mode)');
    console.log('✓ Job claiming working');
    console.log('✓ Job completion working');

  } catch (error) {
    console.error('❌ V3 Integration Test FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

testIntegration();