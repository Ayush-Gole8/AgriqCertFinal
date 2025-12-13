#!/usr/bin/env node

// Test script for V4 verification
import mongoose from 'mongoose';
import { verifyService } from './src/services/verifyService.js';
import { injiClient } from './src/services/injiClient.js';
import config from './src/config/index.js';

console.log('🧪 Starting V4 Verification Test...');

async function testVerification() {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB connected');

    // Test 1: Create a mock VC
    console.log('\n🔧 Test 1: Creating mock VC...');
    const mockVC = {
      credentialSubject: {
        id: 'did:agriqcert:batch:test123',
        batchId: 'test123',
        productType: 'Vegetables',
        productName: 'Test Tomatoes',
        quantity: 100,
        unit: 'kg',
      },
      type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      issuer: 'did:example:agriqcert',
    };

    const issuedVC = await injiClient.issueVC(mockVC);
    console.log('✅ Mock VC created successfully');
    console.log(`   - VC ID: ${issuedVC.vcId}`);

    // Test 2: Verify by VC JSON
    console.log('\n🔍 Test 2: Verifying VC by JSON...');
    const verifyResultJSON = await verifyService.verify({
      vcJson: issuedVC.vcJson
    });
    
    console.log('✅ VC JSON verification result:');
    console.log(`   - Valid: ${verifyResultJSON.valid}`);
    console.log(`   - Signature Valid: ${verifyResultJSON.signatureValid}`);
    console.log(`   - Revoked: ${verifyResultJSON.revoked}`);
    console.log(`   - Issuer: ${verifyResultJSON.issuer}`);
    console.log(`   - Locally Verified: ${verifyResultJSON.locallyVerified}`);

    // Test 3: Verify by VC URL
    console.log('\n🌐 Test 3: Verifying VC by URL...');
    const verifyResultURL = await verifyService.verify({
      vcUrl: issuedVC.vcUrl
    });
    
    console.log('✅ VC URL verification result:');
    console.log(`   - Valid: ${verifyResultURL.valid}`);
    console.log(`   - Signature Valid: ${verifyResultURL.signatureValid}`);
    console.log(`   - Revoked: ${verifyResultURL.revoked}`);

    // Test 4: Verify by QR payload
    console.log('\n📱 Test 4: Verifying QR payload...');
    const qrPayload = JSON.stringify({
      type: 'AgriQCert',
      certId: 'CERT-2024-001',
      vcUrl: issuedVC.vcUrl,
      hash: 'abc123',
    });
    
    const verifyResultQR = await verifyService.verify({
      qrPayload
    });
    
    console.log('✅ QR payload verification result:');
    console.log(`   - Valid: ${verifyResultQR.valid}`);
    console.log(`   - Signature Valid: ${verifyResultQR.signatureValid}`);

    // Test 5: Test invalid VC
    console.log('\n❌ Test 5: Testing invalid VC...');
    const invalidVC = {
      ...issuedVC.vcJson,
      // Remove required fields to make it invalid
      '@context': undefined,
      type: 'InvalidType', // Not an array and doesn't include VerifiableCredential
      issuer: undefined
    };
    
    const verifyResultInvalid = await verifyService.verify({
      vcJson: invalidVC
    });
    
    console.log('✅ Invalid VC verification result:');
    console.log(`   - Valid: ${verifyResultInvalid.valid} (should be false)`);
    console.log(`   - Errors: ${verifyResultInvalid.errors?.length || 0} errors found`);

    // Validate test results
    const allTests = [
      { name: 'VC JSON verification', passed: verifyResultJSON.valid && verifyResultJSON.signatureValid && !verifyResultJSON.revoked },
      { name: 'VC URL verification', passed: verifyResultURL.valid && verifyResultURL.signatureValid && !verifyResultURL.revoked },
      { name: 'QR payload verification', passed: verifyResultQR.valid && verifyResultQR.signatureValid },
      { name: 'Invalid VC rejection', passed: !verifyResultInvalid.valid },
    ];

    const passedTests = allTests.filter(t => t.passed).length;
    const totalTests = allTests.length;

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    allTests.forEach(test => {
      console.log(`   ${test.passed ? '✅' : '❌'} ${test.name}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 V4 Verification Test PASSED!');
      console.log('✓ VC JSON verification working');
      console.log('✓ VC URL verification working');  
      console.log('✓ QR payload verification working');
      console.log('✓ Invalid VC detection working');
    } else {
      console.log('\n❌ V4 Verification Test FAILED!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ V4 Verification Test FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

testVerification();