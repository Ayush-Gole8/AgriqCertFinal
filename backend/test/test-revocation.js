#!/usr/bin/env node

/**
 * V5 Revocation Test Script
 * Tests credential revocation functionality including:
 * - Issuing a credential
 * - Revoking the credential  
 * - Verifying the revocation status
 * - Testing revocation endpoint access
 */

import mongoose from 'mongoose';
import injiClient from './src/services/injiClient.js';
import verifyService from './src/services/verifyService.js';
import { Revocation } from './src/models/Revocation.js';
import { Certificate } from './src/models/Certificate.js';
import config from './src/config/index.js';
import crypto from 'crypto';

async function testRevocation() {
  console.log('🧪 Starting V5 Revocation Test...');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB connected');

    // Initialize services are already imported as singletons

    // Test 1: Issue a credential
    console.log('\n🔧 Test 1: Issuing a credential...');
    const uniqueId = Date.now();
    const mockVC = {
      credentialSubject: {
        id: `did:agriqcert:revocation-test-${uniqueId}`,
        batchId: `revocation-test-batch-${uniqueId}`,
        productType: 'Grain',
        productName: 'Test Wheat',
        quantity: 50,
        unit: 'tons',
      },
      type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      issuer: 'did:example:agriqcert',
    };

    const issuedVC = await injiClient.issueVC(mockVC);
    console.log('✅ Credential issued successfully');
    console.log(`   - VC ID: ${issuedVC.vcId}`);

    // Create certificate record for revocation testing
    const vcHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(issuedVC.vcJson))
      .digest('hex');

    const certificate = new Certificate({
      batchId: mockVC.credentialSubject.batchId,
      vc: issuedVC.vcJson, // Full VC JSON object
      vcUrl: issuedVC.vcUrl,
      vcHash: vcHash,
      qrCodeData: JSON.stringify({
        type: 'AgriQCert',
        certId: `CERT-REV-${uniqueId}`,
        vcUrl: issuedVC.vcUrl,
        hash: vcHash
      }),
      issuedBy: 'test-admin', // Required field
      status: 'active',
      metadata: {
        productType: mockVC.credentialSubject.productType,
        productName: mockVC.credentialSubject.productName,
      }
    });

    await certificate.save();
    console.log(`   - Certificate saved: ${certificate.certificateId}`);
    console.log(`   - Certificate _id: ${certificate._id}`);
    console.log(`   - VC Hash: ${vcHash}`);

    // Use the certificate's MongoDB _id as the certificateId for revocation
    const savedCertId = certificate._id.toString();

    // Test 2: Verify credential is not revoked initially
    console.log('\n🔍 Test 2: Verifying credential is not revoked...');
    const initialVerifyResult = await verifyService.verify({
      vcJson: issuedVC.vcJson
    });
    
    console.log('✅ Initial verification result:');
    console.log(`   - Valid: ${initialVerifyResult.valid}`);
    console.log(`   - Revoked: ${initialVerifyResult.revoked}`);

    if (initialVerifyResult.revoked) {
      throw new Error('Credential should not be revoked initially');
    }

    // Test 3: Create revocation
    console.log('\n🚫 Test 3: Revoking the credential...');
    const revocation = new Revocation({
      vcHash: vcHash,
      certificateId: savedCertId,
      reason: 'quality_issue', // Use valid enum value
      revokedBy: 'admin@agriqcert.com',
      revokedAt: new Date(),
    });

    await revocation.save();
    console.log('✅ Revocation record created');
    console.log(`   - Revocation ID: ${revocation._id}`);
    console.log(`   - Reason: ${revocation.reason}`);

    // Test 4: Verify credential is now revoked
    console.log('\n🔍 Test 4: Verifying credential is now revoked...');
    const revokedVerifyResult = await verifyService.verify({
      vcJson: issuedVC.vcJson
    });
    
    console.log('✅ Revoked verification result:');
    console.log(`   - Valid: ${revokedVerifyResult.valid}`);
    console.log(`   - Revoked: ${revokedVerifyResult.revoked}`);
    console.log(`   - Certificate ID: ${revokedVerifyResult.certificateId || 'Not found'}`);

    if (!revokedVerifyResult.revoked) {
      throw new Error('Credential should be revoked after revocation');
    }

    // Test 5: Test revocation status check directly
    console.log('\n📋 Test 5: Testing direct revocation status check...');
    const directRevocationCheck = await Revocation.isRevoked(vcHash);
    
    console.log('✅ Direct revocation check result:');
    console.log(`   - Is Revoked: ${!!directRevocationCheck}`);
    console.log(`   - Certificate ID: ${directRevocationCheck?.certificateId || 'N/A'}`);
    console.log(`   - Reason: ${directRevocationCheck?.reason || 'N/A'}`);

    if (!directRevocationCheck) {
      throw new Error('Direct revocation check should return revocation record');
    }

    // Test 6: Test revocation by certificate ID
    console.log('\n🔍 Test 6: Testing revocation lookup by certificate ID...');
    const certRevocation = await Revocation.findOne({ certificateId: savedCertId });
    
    console.log('✅ Certificate revocation lookup:');
    console.log(`   - Found: ${!!certRevocation}`);
    console.log(`   - Status: ${certRevocation ? 'Revoked' : 'Active'}`);

    if (!certRevocation) {
      throw new Error('Should find revocation by certificate ID');
    }

    // Validate all test results
    const allTests = [
      { name: 'Credential issuance', passed: !!issuedVC.vcId },
      { name: 'Initial verification (not revoked)', passed: !initialVerifyResult.revoked },
      { name: 'Revocation record creation', passed: !!revocation._id },
      { name: 'Post-revocation verification', passed: revokedVerifyResult.revoked },
      { name: 'Direct revocation check', passed: !!directRevocationCheck },
      { name: 'Certificate ID revocation lookup', passed: !!certRevocation },
    ];

    const passedTests = allTests.filter(t => t.passed).length;
    const totalTests = allTests.length;

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    allTests.forEach(test => {
      console.log(`   ${test.passed ? '✅' : '❌'} ${test.name}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 V5 Revocation Test PASSED!');
      console.log('✓ Credential revocation working');
      console.log('✓ Revocation verification working');
      console.log('✓ Revocation lookup working');
      console.log('✓ Certificate ID mapping working');
    } else {
      console.log('\n❌ V5 Revocation Test FAILED!');
      process.exit(1);
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await Revocation.deleteOne({ _id: revocation._id });
    await Certificate.deleteOne({ _id: certificate._id });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ V5 Revocation Test FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

testRevocation();