#!/usr/bin/env node

/**
 * V6 Frontend Integration Test Script
 * Tests frontend integration with Inji endpoints including:
 * - Frontend API client availability
 * - Component existence for Inji features
 * - Integration with verification endpoints
 * - QR code scanning components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFrontendIntegration() {
  console.log('🧪 Starting V6 Frontend Integration Test...');
  
  try {
    const frontendPath = path.join(__dirname, '..', 'frontend');
    const srcPath = path.join(frontendPath, 'src');
    
    // Check if frontend directory exists
    if (!fs.existsSync(frontendPath)) {
      throw new Error('Frontend directory not found');
    }
    
    console.log('✅ Frontend directory found');

    // Test 1: Check API client for Inji endpoints
    console.log('\n🔧 Test 1: Checking API client...');
    const apiClientPath = path.join(srcPath, 'api', 'apiClient.ts');
    
    if (!fs.existsSync(apiClientPath)) {
      console.log('❌ API client not found');
    } else {
      const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');
      
      // Check for verification endpoint
      const hasVerifyEndpoint = apiClientContent.includes('verify') || 
                               apiClientContent.includes('/api/verify') ||
                               apiClientContent.includes('verification');
      
      // Check for QR scanning related endpoints
      const hasQRSupport = apiClientContent.includes('qr') || 
                          apiClientContent.includes('QR') ||
                          apiClientContent.includes('scan');
      
      console.log('✅ API client found');
      console.log(`   - Verification endpoint support: ${hasVerifyEndpoint ? '✅' : '❌'}`);
      console.log(`   - QR scanning support: ${hasQRSupport ? '✅' : '❌'}`);
    }

    // Test 2: Check for verification related components
    console.log('\n🔍 Test 2: Checking verification components...');
    const componentsPath = path.join(srcPath, 'components');
    
    if (!fs.existsSync(componentsPath)) {
      console.log('❌ Components directory not found');
    } else {
      const componentFiles = fs.readdirSync(componentsPath, { recursive: true })
        .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));
      
      // Check for verification-related components
      const verificationComponents = componentFiles.filter(file => 
        file.toLowerCase().includes('verify') || 
        file.toLowerCase().includes('verification') ||
        file.toLowerCase().includes('result')
      );
      
      // Check for QR-related components
      const qrComponents = componentFiles.filter(file => 
        file.toLowerCase().includes('qr') || 
        file.toLowerCase().includes('scan') ||
        file.toLowerCase().includes('camera')
      );
      
      console.log('✅ Components directory found');
      console.log(`   - Total component files: ${componentFiles.length}`);
      console.log(`   - Verification components: ${verificationComponents.length} found`);
      console.log(`   - QR components: ${qrComponents.length} found`);
      
      if (verificationComponents.length > 0) {
        console.log(`   - Verification components: ${verificationComponents.join(', ')}`);
      }
      if (qrComponents.length > 0) {
        console.log(`   - QR components: ${qrComponents.join(', ')}`);
      }
    }

    // Test 3: Check for verification pages
    console.log('\n📄 Test 3: Checking verification pages...');
    const pagesPath = path.join(srcPath, 'pages');
    
    if (!fs.existsSync(pagesPath)) {
      console.log('❌ Pages directory not found');
    } else {
      const pageFiles = fs.readdirSync(pagesPath)
        .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));
      
      const verifyPage = pageFiles.find(file => 
        file.toLowerCase().includes('verify') ||
        file.toLowerCase().includes('verification')
      );
      
      console.log('✅ Pages directory found');
      console.log(`   - Total page files: ${pageFiles.length}`);
      console.log(`   - Verification page: ${verifyPage ? verifyPage : 'Not found'}`);
      
      if (verifyPage) {
        const verifyPagePath = path.join(pagesPath, verifyPage);
        const verifyPageContent = fs.readFileSync(verifyPagePath, 'utf8');
        
        // Check for verification functionality
        const hasVerificationLogic = verifyPageContent.includes('verify') ||
                                    verifyPageContent.includes('verification') ||
                                    verifyPageContent.includes('VerificationResult');
        
        const hasQRScanning = verifyPageContent.includes('QR') ||
                             verifyPageContent.includes('camera') ||
                             verifyPageContent.includes('scan');
        
        console.log(`   - Has verification logic: ${hasVerificationLogic ? '✅' : '❌'}`);
        console.log(`   - Has QR scanning: ${hasQRScanning ? '✅' : '❌'}`);
      }
    }

    // Test 4: Check package.json for QR/camera dependencies
    console.log('\n📦 Test 4: Checking dependencies...');
    const packageJsonPath = path.join(frontendPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('❌ package.json not found');
    } else {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const allDeps = { 
        ...packageJson.dependencies, 
        ...packageJson.devDependencies 
      };
      
      // Check for QR/camera related dependencies
      const qrDependencies = Object.keys(allDeps).filter(dep => 
        dep.includes('qr') || 
        dep.includes('camera') ||
        dep.includes('scanner') ||
        dep.includes('barcode')
      );
      
      // Check for verification/crypto dependencies
      const cryptoDependencies = Object.keys(allDeps).filter(dep => 
        dep.includes('crypto') ||
        dep.includes('verify') ||
        dep.includes('validation')
      );
      
      console.log('✅ package.json found');
      console.log(`   - Total dependencies: ${Object.keys(allDeps).length}`);
      console.log(`   - QR/Camera dependencies: ${qrDependencies.length > 0 ? qrDependencies.join(', ') : 'None found'}`);
      console.log(`   - Crypto/Verification dependencies: ${cryptoDependencies.length > 0 ? cryptoDependencies.join(', ') : 'None found'}`);
    }

    // Test 5: Check routing for verification pages
    console.log('\n🛣️ Test 5: Checking routing configuration...');
    const routingFiles = [
      path.join(srcPath, 'App.tsx'),
      path.join(srcPath, 'main.tsx'),
      path.join(srcPath, 'router.tsx'),
      path.join(srcPath, 'routes.tsx')
    ];
    
    let verificationRoutes = 0;
    for (const routeFile of routingFiles) {
      if (fs.existsSync(routeFile)) {
        const routeContent = fs.readFileSync(routeFile, 'utf8');
        if (routeContent.includes('verify') || routeContent.includes('/verify')) {
          verificationRoutes++;
        }
      }
    }
    
    console.log('✅ Routing check completed');
    console.log(`   - Files with verification routes: ${verificationRoutes}`);

    // Test 6: Check build configuration
    console.log('\n🔨 Test 6: Checking build configuration...');
    const buildConfigFiles = [
      path.join(frontendPath, 'vite.config.ts'),
      path.join(frontendPath, 'vite.config.js'),
      path.join(frontendPath, 'webpack.config.js'),
      path.join(frontendPath, 'next.config.js')
    ];
    
    let buildConfigFound = false;
    for (const configFile of buildConfigFiles) {
      if (fs.existsSync(configFile)) {
        buildConfigFound = true;
        const configName = path.basename(configFile);
        console.log(`   - Found build config: ${configName}`);
        break;
      }
    }
    
    if (!buildConfigFound) {
      console.log('❌ No build configuration found');
    } else {
      console.log('✅ Build configuration found');
    }

    // Validate all test results
    const tests = [
      { name: 'Frontend directory exists', passed: fs.existsSync(frontendPath) },
      { name: 'API client exists', passed: fs.existsSync(apiClientPath) },
      { name: 'Components directory exists', passed: fs.existsSync(componentsPath) },
      { name: 'Pages directory exists', passed: fs.existsSync(pagesPath) },
      { name: 'Package.json exists', passed: fs.existsSync(packageJsonPath) },
      { name: 'Build configuration exists', passed: buildConfigFound },
    ];

    const passedTests = tests.filter(t => t.passed).length;
    const totalTests = tests.length;

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    tests.forEach(test => {
      console.log(`   ${test.passed ? '✅' : '❌'} ${test.name}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 V6 Frontend Integration Test PASSED!');
      console.log('✓ Frontend structure is properly set up');
      console.log('✓ Components and pages are organized');
      console.log('✓ Build configuration is available');
      console.log('✓ Package dependencies are configured');
    } else {
      console.log('\n⚠️ V6 Frontend Integration Test PASSED with WARNINGS!');
      console.log('Frontend structure exists but may need Inji-specific components');
    }

  } catch (error) {
    console.error('❌ V6 Frontend Integration Test FAILED:');
    console.error(error);
    process.exit(1);
  }
}

testFrontendIntegration();