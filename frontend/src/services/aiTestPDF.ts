// Test utility for PDF processing
// This helps test the AI lab report processing with PDF files

export const testPDFProcessing = async () => {
  // Create a test blob that simulates a PDF with lab report content
  const sampleLabReportText = `
AGRICULTURAL QUALITY ANALYSIS REPORT
Sample ID: AGR-2024-001
Date: January 31, 2024
Laboratory: AgroTest Labs

QUALITY ASSESSMENT RESULTS

Parameter Analysis:
- Moisture Content: 12.5%
- Temperature: 22.3°C 
- pH Level: 6.8

Protein Content: 14.2%
Ash Content: 1.8%
Foreign Matter: 0.3%

QUALITY STATUS: PASSED

Analysis conducted according to ISO standards
Analyst: Dr. Sarah Johnson
Certified by: AgroTest Labs (License #AL-2024-001)

Notes: All parameters within acceptable ranges for export quality grade A.
`;

  // Create a test file object that can be used to test the AI processing
  const createTestFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    return new File([blob], filename, { type });
  };

  return {
    // Text file version for testing
    textFile: createTestFile(sampleLabReportText, 'test-lab-report.txt', 'text/plain'),
    
    // JSON version for testing
    jsonFile: createTestFile(JSON.stringify({
      "labReport": {
        "sampleId": "AGR-2024-001",
        "date": "2024-01-31",
        "laboratory": "AgroTest Labs",
        "measurements": {
          "moistureContent": "12.5%",
          "temperature": "22.3°C",
          "phLevel": "6.8",
          "proteinContent": "14.2%"
        },
        "status": "PASSED"
      }
    }, null, 2), 'test-lab-report.json', 'application/json'),
    
    // Sample content for manual testing
    sampleContent: sampleLabReportText
  };
};

// Function to test the complete AI processing workflow
export const testAIWorkflow = async () => {
  try {
    const { createAIClient, processLabReportWithAI } = await import('./aiLabReportService');
    
    console.log('🧪 Testing AI Lab Report Processing...');
    
    // Create test data
    const testData = await testPDFProcessing();
    
    // Test with sample content directly
    console.log('Testing with sample lab report text...');
    
    const client = createAIClient();
    const result = await processLabReportWithAI(testData.sampleContent, client);
    
    console.log('✅ AI Processing Result:', result);
    
    // Validate results
    if (result.parameters && result.parameters.length > 0) {
      console.log(`✅ Successfully extracted ${result.extractedValues} parameters with ${result.confidence} confidence`);
      
      result.parameters.forEach((param, index) => {
        console.log(`   ${index + 1}. ${param.parameter}: ${param.value} ${param.unit}`);
      });
      
      return { success: true, result };
    } else {
      console.log('❌ No parameters extracted');
      return { success: false, error: 'No parameters extracted' };
    }
    
  } catch (error) {
    console.error('❌ AI Workflow Test Failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Expected test results for validation
export const expectedTestResults = {
  moistureContent: { value: "12.5", unit: "%" },
  temperature: { value: "22.3", unit: "°C" },
  phLevel: { value: "6.8", unit: "pH" }
};

// Usage instructions for developers
export const testInstructions = `
🧪 AI Lab Report Processing Test Instructions

1. Open browser console
2. Import the test function:
   import { testAIWorkflow } from './services/aiTestPDF'

3. Run the test:
   testAIWorkflow().then(result => console.log(result))

4. Check the results:
   - Should extract 3 parameters (Moisture, Temperature, pH)
   - Confidence should be "high"
   - All values should match expected results

5. Test with actual PDF:
   - Use the AI Extract button in inspection form
   - Upload a PDF lab report
   - Verify parameters are extracted correctly

Expected Output:
{
  "parameters": [
    { "parameter": "Moisture Content", "value": "12.5", "unit": "%", ... },
    { "parameter": "Temperature", "value": "22.3", "unit": "°C", ... },
    { "parameter": "pH Level", "value": "6.8", "unit": "pH", ... }
  ],
  "extractedValues": 3,
  "confidence": "high"
}
`;

console.log(testInstructions);