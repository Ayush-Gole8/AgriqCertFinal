/**
 * Complete Workflow Test Script
 * Tests: Create Batch → Complete Inspection → Issue Certificate via Inji
 */

import axios from 'axios';
import qrcode from 'qrcode-terminal';

const API_BASE = 'http://localhost:5000/api';

// Test data
const testData = {
  farmer: {
    email: 'farmer-test@example.com',
    password: 'Test1234!',
    name: 'Test Farmer',
    role: 'farmer'
  },
  inspector: {
    email: 'inspector-test@example.com',
    password: 'Test1234!',
    name: 'Test Inspector',
    role: 'qa_inspector'
  },
  certifier: {
    email: 'certifier-test@example.com',
    password: 'Test1234!',
    name: 'Test Certifier',
    role: 'certifier'
  }
};

let tokens = {};
let batchId = null;
let inspectionId = null;
let jobId = null;
let certificateId = null;

// Helper function
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Step 1: Register and Login Users
async function setupUsers() {
  console.log('\n📝 Step 1: Setting up users...\n');
  
  for (const [role, userData] of Object.entries(testData)) {
    try {
      // Try to register
      await apiCall('POST', '/auth/register', userData);
      console.log(`✅ Registered ${role}: ${userData.email}`);
    } catch (error) {
      console.log(`ℹ️  ${role} already exists, skipping registration`);
    }
    
    // Login
    const loginData = await apiCall('POST', '/auth/login', {
      email: userData.email,
      password: userData.password
    });
    
    tokens[role] = loginData.data.tokens.accessToken;
    console.log(`✅ Logged in ${role}`);
  }
}

// Step 2: Create Batch
async function createBatch() {
  console.log('\n🌾 Step 2: Creating batch...\n');
  
  const batchData = {
    productType: 'grain',
    productName: 'Organic Wheat',
    quantity: 1000,
    unit: 'kg',
    harvestDate: new Date().toISOString().split('T')[0],
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      address: '123 Farm Road, Agricultural District',
      region: 'Agricultural District'
    },
    certifications: ['organic', 'quality_tested'],
    notes: 'Test batch for Inji integration workflow'
  };
  
  const response = await apiCall('POST', '/batches', batchData, tokens.farmer);
  batchId = response.data.batch.id;
  
  console.log(`✅ Batch created: ${batchId}`);
  console.log(`   Product: ${response.data.batch.productName}`);
  console.log(`   Quantity: ${response.data.batch.quantity} ${response.data.batch.unit}`);
  console.log(`   Status: ${response.data.batch.status}`);
  
  // Submit the batch
  await apiCall('POST', `/batches/${batchId}/submit`, {}, tokens.farmer);
  console.log(`✅ Batch submitted for inspection`);
}

// Step 3: Create and Complete Inspection
async function completeInspection() {
  console.log('\n🔍 Step 3: Creating and completing inspection...\n');
  
  const inspectionData = {
    readings: [
      {
        parameter: 'moisture',
        value: 12.5,
        unit: '%',
        passed: true,
        minThreshold: 10,
        maxThreshold: 14
      },
      {
        parameter: 'protein_content',
        value: 13.2,
        unit: '%',
        passed: true,
        minThreshold: 12,
        maxThreshold: 15
      },
      {
        parameter: 'foreign_matter',
        value: 0.3,
        unit: '%',
        passed: true,
        maxThreshold: 0.5
      }
    ],
    geolocation: {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 10.5,
      timestamp: new Date().toISOString()
    },
    notes: 'Excellent quality. Meets all organic standards.'
  };
  
  const response = await apiCall('POST', `/inspections/batch/${batchId}`, inspectionData, tokens.inspector);
  inspectionId = response.data.inspection.id;
  
  console.log(`✅ Inspection created: ${inspectionId}`);
  console.log(`   Status: ${response.data.inspection.status}`);
  console.log(`   Inspector: ${response.data.inspection.inspectorName}`);
  
  // Complete the inspection
  console.log('\n📝 Completing inspection...');
  const updateData = {
    status: 'completed',
    outcome: {
      classification: 'pass',
      reasoning: 'All quality parameters met. Batch approved for certification.',
      recommendations: 'Ready for certificate issuance',
      followUpRequired: false
    }
  };
  
  await apiCall('PUT', `/inspections/${inspectionId}`, updateData, tokens.inspector);
  console.log('✅ Inspection completed and approved');
}

// Step 4: Issue Certificate (Calls Inji Certify API)
async function issueCertificate() {
  console.log('\n🎓 Step 4: Issuing certificate via Inji Certify API...\n');
  
  const issueData = {
    batchId: batchId,
    inspectionId: inspectionId
  };
  
  const response = await apiCall('POST', '/vc/issue', issueData, tokens.certifier);
  jobId = response.data.jobId;
  
  console.log(`✅ Issuance job created: ${jobId}`);
  console.log(`   Status: ${response.data.status}`);
  console.log(`   Message: ${response.message}`);
  console.log('\n⏳ Job queued for processing by worker...');
}

// Step 5: Poll Job Status
async function pollJobStatus() {
  console.log('\n🔄 Step 5: Polling job status...\n');
  
  const maxAttempts = 20;
  const pollInterval = 5000; // 5 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await apiCall('GET', `/vc/jobs/${jobId}`, null, tokens.certifier);
    
    console.log(`[Attempt ${attempt}/${maxAttempts}] Job Status: ${response.data.status}`);
    
    if (response.data.status === 'completed') {
      certificateId = response.data.certificateId;
      console.log(`\n✅ Certificate issued successfully!`);
      console.log(`   Certificate ID: ${certificateId}`);
      
      // Get full certificate details
      const certResponse = await apiCall('GET', `/vc/certificates/${certificateId}`, null, tokens.certifier);
      const cert = certResponse.data;
      
      console.log('\n📄 Certificate Details:');
      console.log(`   VC ID: ${cert.vcId}`);
      console.log(`   VC URL: ${cert.vcUrl}`);
      console.log(`   Status: ${cert.status}`);
      console.log(`   Issued At: ${cert.issuedAt}`);
      console.log(`   Expires At: ${cert.expiresAt}`);
      
      if (cert.walletMetadata) {
        console.log('\n📱 Wallet Integration:');
        console.log(`   Push Status: ${cert.walletMetadata.pushStatus}`);
        console.log(`   Push Attempts: ${cert.walletMetadata.pushAttempts || 0}`);
        
        if (cert.walletMetadata.deeplink) {
          const offerUrl = cert.walletMetadata.deeplink;
          
          console.log('\n' + '='.repeat(70));
          console.log('🎫 CREDENTIAL ISSUANCE OFFER');
          console.log('='.repeat(70));
          
          // Option A: QR Code (Best for Demo)
          console.log('\n📱 Option A: Scan QR Code with Inji Wallet (RECOMMENDED)\n');
          qrcode.generate(offerUrl, { small: true });
          
          // Option B: Clickable Link
          console.log('\n🔗 Option B: Click Link (Web Wallet)');
          console.log(`   ${offerUrl}`);
          
          console.log('\n' + '='.repeat(70));
          console.log('📋 Instructions:');
          console.log('   1. Open Inji Wallet app on your mobile device');
          console.log('   2. Tap "Scan QR Code" or "Add Credential"');
          console.log('   3. Scan the QR code above OR click the link');
          console.log('   4. Review credential details and accept');
          console.log('   5. Certificate will be added to your wallet!');
          console.log('='.repeat(70));
        }
      }
      
      return true;
    } else if (response.data.status === 'failed') {
      console.log(`\n❌ Job failed: ${response.data.error}`);
      return false;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  console.log('\n⚠️  Job did not complete within timeout period');
  return false;
}

// Main execution
async function runWorkflow() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AgriQCert - Complete Inji Integration Workflow Test');
  console.log('='.repeat(60));
  
  try {
    await setupUsers();
    await createBatch();
    await completeInspection();
    await issueCertificate();
    const success = await pollJobStatus();
    
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ WORKFLOW COMPLETED SUCCESSFULLY!');
      console.log('\n📋 Summary:');
      console.log(`   Batch ID: ${batchId}`);
      console.log(`   Inspection ID: ${inspectionId}`);
      console.log(`   Job ID: ${jobId}`);
      console.log(`   Certificate ID: ${certificateId}`);
    } else {
      console.log('❌ WORKFLOW FAILED');
    }
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Workflow error:', error.message);
    process.exit(1);
  }
}

// Run the workflow
runWorkflow().catch(console.error);
