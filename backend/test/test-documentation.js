#!/usr/bin/env node

/**
 * V8 Documentation Verification Test Script
 * Tests documentation completeness and accuracy including:
 * - README files and getting started guides
 * - API documentation
 * - Integration documentation
 * - Code documentation and comments
 * - Architecture documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  return {
    hasTitle: /^#\s+/.test(content),
    hasDescription: content.split('\\n').slice(1, 10).some(line => line.trim().length > 20),
    hasInstallation: /install|setup|getting.started/i.test(content),
    hasUsage: /usage|how.to|example/i.test(content),
    hasAPI: /api|endpoint|route/i.test(content),
    hasInji: /inji|credential|verif/i.test(content),
    wordCount: content.split(/\\s+/).length,
    sectionCount: (content.match(/^#+/gm) || []).length,
    hasCodeBlocks: /```/.test(content)
  };
}

function analyzeCodeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
  
  const commentLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || 
           trimmed.startsWith('/*') || 
           trimmed.startsWith('*') ||
           trimmed.startsWith('/**');
  });
  
  const jsdocComments = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
  const functionDeclarations = (content.match(/function\s+\w+|\w+\s*[:=]\s*function|\w+\s*[:=]\s*\([^)]*\)\s*=>/g) || []).length;
  const classDeclarations = (content.match(/class\s+\w+|interface\s+\w+|type\s+\w+/g) || []).length;
  
  return {
    totalLines: lines.length,
    commentLines: commentLines.length,
    commentRatio: commentLines.length / lines.length,
    jsdocComments,
    functionDeclarations,
    classDeclarations,
    hasTypeDefinitions: /interface|type|enum/i.test(content)
  };
}

async function testDocumentation() {
  console.log('🧪 Starting V8 Documentation Verification Test...');
  
  try {
    const rootPath = path.join(__dirname, '..');
    const backendPath = path.join(rootPath, 'backend');
    const frontendPath = path.join(rootPath, 'frontend');

    // Test 1: Check core documentation files
    console.log('\n📚 Test 1: Core documentation files...');
    
    const coreDocsToCheck = [
      { path: path.join(rootPath, 'README.md'), name: 'Root README' },
      { path: path.join(backendPath, 'README.md'), name: 'Backend README' },
      { path: path.join(frontendPath, 'README.md'), name: 'Frontend README' },
      { path: path.join(backendPath, 'GET_STARTED.md'), name: 'Getting Started Guide' },
      { path: path.join(backendPath, 'API_TESTING.md'), name: 'API Testing Guide' },
      { path: path.join(backendPath, 'ARCHITECTURE.md'), name: 'Architecture Documentation' },
      { path: path.join(backendPath, 'FRONTEND_INTEGRATION.md'), name: 'Frontend Integration Guide' }
    ];
    
    let docScore = 0;
    const docAnalysis = [];
    
    coreDocsToCheck.forEach(doc => {
      if (fs.existsSync(doc.path)) {
        docScore++;
        const analysis = analyzeMarkdownFile(doc.path);
        docAnalysis.push({ ...doc, analysis });
        
        console.log(`   ✅ ${doc.name} found`);
        console.log(`      - Sections: ${analysis.sectionCount}, Words: ${analysis.wordCount}`);
        console.log(`      - Has Installation: ${analysis.hasInstallation ? '✅' : '❌'}`);
        console.log(`      - Has Usage: ${analysis.hasUsage ? '✅' : '❌'}`);
        console.log(`      - Has Inji Content: ${analysis.hasInji ? '✅' : '❌'}`);
      } else {
        console.log(`   ❌ ${doc.name} not found`);
        docAnalysis.push({ ...doc, analysis: null });
      }
    });
    
    console.log(`✅ Documentation completeness: ${docScore}/${coreDocsToCheck.length} core files found`);

    // Test 2: API Documentation Quality
    console.log('\n🔌 Test 2: API documentation quality...');
    
    const apiTestingDoc = path.join(backendPath, 'API_TESTING.md');
    if (fs.existsSync(apiTestingDoc)) {
      const apiAnalysis = analyzeMarkdownFile(apiTestingDoc);
      
      console.log('✅ API Testing documentation found');
      console.log(`   - Word count: ${apiAnalysis.wordCount}`);
      console.log(`   - Has code examples: ${apiAnalysis.hasCodeBlocks ? '✅' : '❌'}`);
      console.log(`   - Covers Inji endpoints: ${apiAnalysis.hasInji ? '✅' : '❌'}`);
      
      // Check for specific API endpoints
      const content = fs.readFileSync(apiTestingDoc, 'utf8');
      const hasVerifyEndpoint = /\/api\/verify|verify.*endpoint/i.test(content);
      const hasAuthEndpoints = /\/api\/auth|auth.*endpoint/i.test(content);
      const hasBatchEndpoints = /\/api\/batch|batch.*endpoint/i.test(content);
      
      console.log(`   - Documents verify endpoint: ${hasVerifyEndpoint ? '✅' : '❌'}`);
      console.log(`   - Documents auth endpoints: ${hasAuthEndpoints ? '✅' : '❌'}`);
      console.log(`   - Documents batch endpoints: ${hasBatchEndpoints ? '✅' : '❌'}`);
    } else {
      console.log('❌ API Testing documentation not found');
    }

    // Test 3: Architecture Documentation
    console.log('\n🏗️ Test 3: Architecture documentation...');
    
    const archDoc = path.join(backendPath, 'ARCHITECTURE.md');
    if (fs.existsSync(archDoc)) {
      const archAnalysis = analyzeMarkdownFile(archDoc);
      const content = fs.readFileSync(archDoc, 'utf8');
      
      const hasDataFlow = /data.flow|workflow|process/i.test(content);
      const hasComponentDiagram = /component|diagram|architecture/i.test(content);
      const hasInjiIntegration = /inji|integration|provider/i.test(content);
      const hasDatabaseSchema = /database|schema|model|collection/i.test(content);
      
      console.log('✅ Architecture documentation found');
      console.log(`   - Word count: ${archAnalysis.wordCount}`);
      console.log(`   - Describes data flow: ${hasDataFlow ? '✅' : '❌'}`);
      console.log(`   - Has component info: ${hasComponentDiagram ? '✅' : '❌'}`);
      console.log(`   - Documents Inji integration: ${hasInjiIntegration ? '✅' : '❌'}`);
      console.log(`   - Describes database schema: ${hasDatabaseSchema ? '✅' : '❌'}`);
    } else {
      console.log('❌ Architecture documentation not found');
    }

    // Test 4: Code Documentation Quality
    console.log('\n💻 Test 4: Code documentation quality...');
    
    // Check backend TypeScript files
    const backendSrcPath = path.join(backendPath, 'src');
    const codeFiles = [];
    
    function walkDir(dir, extension) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath, extension);
        } else if (file.endsWith(extension)) {
          codeFiles.push(filePath);
        }
      });
    }
    
    if (fs.existsSync(backendSrcPath)) {
      walkDir(backendSrcPath, '.ts');
    }
    
    let totalCommentRatio = 0;
    let totalJSDocComments = 0;
    let filesAnalyzed = 0;
    let wellDocumentedFiles = 0;
    
    codeFiles.slice(0, 20).forEach(filePath => { // Sample first 20 files
      try {
        const analysis = analyzeCodeFile(filePath);
        totalCommentRatio += analysis.commentRatio;
        totalJSDocComments += analysis.jsdocComments;
        filesAnalyzed++;
        
        // Consider a file well-documented if it has >5% comments or JSDoc comments
        if (analysis.commentRatio > 0.05 || analysis.jsdocComments > 0) {
          wellDocumentedFiles++;
        }
      } catch (error) {
        // Skip files that can't be analyzed
      }
    });
    
    if (filesAnalyzed > 0) {
      const avgCommentRatio = totalCommentRatio / filesAnalyzed;
      const wellDocumentedRatio = wellDocumentedFiles / filesAnalyzed;
      
      console.log(`✅ Code documentation analysis (${filesAnalyzed} files sampled)`);
      console.log(`   - Average comment ratio: ${(avgCommentRatio * 100).toFixed(1)}%`);
      console.log(`   - Total JSDoc comments: ${totalJSDocComments}`);
      console.log(`   - Well-documented files: ${(wellDocumentedRatio * 100).toFixed(1)}%`);
      console.log(`   - Documentation quality: ${avgCommentRatio > 0.1 ? 'Good' : avgCommentRatio > 0.05 ? 'Fair' : 'Needs Improvement'}`);
    } else {
      console.log('❌ No TypeScript files found for analysis');
    }

    // Test 5: Integration Documentation
    console.log('\n🔗 Test 5: Integration documentation...');
    
    const integrationDoc = path.join(backendPath, 'FRONTEND_INTEGRATION.md');
    if (fs.existsSync(integrationDoc)) {
      const integAnalysis = analyzeMarkdownFile(integrationDoc);
      const content = fs.readFileSync(integrationDoc, 'utf8');
      
      const hasEndpointDocs = /endpoint|api|route/i.test(content);
      const hasExamples = /example|sample|demo/i.test(content);
      const hasErrorHandling = /error|exception|handling/i.test(content);
      const hasAuthentication = /auth|token|login/i.test(content);
      
      console.log('✅ Frontend Integration documentation found');
      console.log(`   - Word count: ${integAnalysis.wordCount}`);
      console.log(`   - Documents endpoints: ${hasEndpointDocs ? '✅' : '❌'}`);
      console.log(`   - Has examples: ${hasExamples ? '✅' : '❌'}`);
      console.log(`   - Covers error handling: ${hasErrorHandling ? '✅' : '❌'}`);
      console.log(`   - Documents authentication: ${hasAuthentication ? '✅' : '❌'}`);
    } else {
      console.log('❌ Frontend Integration documentation not found');
    }

    // Test 6: Setup and Getting Started Quality
    console.log('\n🚀 Test 6: Setup and getting started quality...');
    
    const getStartedDoc = path.join(backendPath, 'GET_STARTED.md');
    if (fs.existsSync(getStartedDoc)) {
      const setupAnalysis = analyzeMarkdownFile(getStartedDoc);
      const content = fs.readFileSync(getStartedDoc, 'utf8');
      
      const hasPrerequisites = /prerequisite|requirement|need/i.test(content);
      const hasInstallSteps = /install|npm|yarn|setup/i.test(content);
      const hasEnvConfig = /environment|env|config/i.test(content);
      const hasRunInstructions = /run|start|launch/i.test(content);
      const hasTroubleshooting = /troubleshoot|issue|problem|error/i.test(content);
      
      console.log('✅ Getting Started documentation found');
      console.log(`   - Word count: ${setupAnalysis.wordCount}`);
      console.log(`   - Lists prerequisites: ${hasPrerequisites ? '✅' : '❌'}`);
      console.log(`   - Has install steps: ${hasInstallSteps ? '✅' : '❌'}`);
      console.log(`   - Covers environment config: ${hasEnvConfig ? '✅' : '❌'}`);
      console.log(`   - Has run instructions: ${hasRunInstructions ? '✅' : '❌'}`);
      console.log(`   - Includes troubleshooting: ${hasTroubleshooting ? '✅' : '❌'}`);
    } else {
      console.log('❌ Getting Started documentation not found');
    }

    // Calculate overall documentation score
    const docTests = [
      { name: 'Core documentation files', score: docScore / coreDocsToCheck.length, weight: 3 },
      { name: 'API documentation quality', score: fs.existsSync(apiTestingDoc) ? 1 : 0, weight: 2 },
      { name: 'Architecture documentation', score: fs.existsSync(archDoc) ? 1 : 0, weight: 2 },
      { name: 'Code documentation quality', score: filesAnalyzed > 0 ? (wellDocumentedFiles / filesAnalyzed) : 0, weight: 2 },
      { name: 'Integration documentation', score: fs.existsSync(integrationDoc) ? 1 : 0, weight: 2 },
      { name: 'Setup documentation', score: fs.existsSync(getStartedDoc) ? 1 : 0, weight: 1 }
    ];
    
    const totalWeight = docTests.reduce((sum, test) => sum + test.weight, 0);
    const weightedScore = docTests.reduce((sum, test) => sum + (test.score * test.weight), 0);
    const overallScore = (weightedScore / totalWeight) * 100;

    console.log(`\n📊 Documentation Quality Score: ${overallScore.toFixed(1)}%`);
    
    docTests.forEach(test => {
      const score = (test.score * 100).toFixed(0) + '%';
      console.log(`   ${test.name}: ${score} (weight: ${test.weight})`);
    });

    if (overallScore >= 80) {
      console.log('\n🎉 V8 Documentation Verification Test PASSED!');
      console.log('✓ Documentation is comprehensive and well-structured');
      console.log('✓ API and integration docs are present');
      console.log('✓ Setup guides are available');
      console.log('✓ Code is adequately documented');
    } else if (overallScore >= 60) {
      console.log('\n⚠️ V8 Documentation Verification Test PASSED with WARNINGS!');
      console.log('Documentation exists but could be improved');
    } else {
      console.log('\n❌ V8 Documentation Verification Test FAILED!');
      console.log('Documentation needs significant improvement');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ V8 Documentation Verification Test FAILED:');
    console.error(error);
    process.exit(1);
  }
}

testDocumentation();