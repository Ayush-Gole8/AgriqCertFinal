// Test file for AI Lab Report Processing
// This demonstrates how the AI extracts parameters from lab reports

export const sampleLabReports = {
  // Sample 1: Standard format
  standardReport: `Agricultural Quality Analysis Report
Sample ID: AGR-2024-001
Date: January 31, 2024
Laboratory: AgroTest Labs

Quality Assessment Results:
- Moisture Content: 12.5%
- Temperature: 22.3°C
- pH Level: 6.8

Quality Status: PASSED
Analyst: Dr. Sarah Johnson
Certified by: AgroTest Labs (License #AL-2024-001)`,

  // Sample 2: Tabular format
  tabularReport: `QUALITY INSPECTION REPORT
Sample: Organic Rice Batch #OR-2024-15

Parameter          | Value   | Unit  | Status
-------------------|---------|-------|--------
Moisture Content   | 13.2    | %     | PASS
Temperature        | 21.8    | °C    | PASS
pH Level           | 6.9     | pH    | PASS
Protein Content    | 7.2     | %     | PASS

Overall Result: ACCEPTABLE FOR DISTRIBUTION`,

  // Sample 3: JSON format
  jsonReport: {
    "labReport": {
      "sampleId": "AGR-2024-003",
      "date": "2024-01-31",
      "laboratory": "Quality Assurance Labs",
      "measurements": {
        "moistureContent": "11.8%",
        "temperature": "23.1°C",
        "phLevel": "7.2",
        "additionalParams": {
          "protein": "6.8%",
          "ash": "1.2%"
        }
      },
      "status": "APPROVED"
    }
  },

  // Sample 4: Informal format
  informalReport: `Hey team,

Just got the lab results back for batch #B2024-42:

The moisture is sitting at 13.8% - a bit high but still within range
Temperature was recorded at 24.2 degrees celsius
pH came back as 6.5

Everything looks good to go!

- Mike from QA`,

  // Sample 5: Failed sample (to test error handling)
  failedReport: `Lab Analysis Report - FAILED SAMPLE
Batch ID: FAIL-2024-01

Quality Parameters:
- Moisture Content: 16.2% (EXCEEDED LIMIT)
- Temperature: 28.5°C (TOO HIGH)
- pH Level: 8.1 (ALKALINE - OUT OF RANGE)

RECOMMENDATION: REJECT BATCH
Reason: Multiple parameters exceeded acceptable limits`
};

// Expected AI extraction results for testing
export const expectedExtractions = {
  standardReport: {
    parameters: [
      {
        parameter: "Moisture Content",
        value: "12.5",
        unit: "%",
        minThreshold: 10,
        maxThreshold: 14,
        passed: true
      },
      {
        parameter: "Temperature",
        value: "22.3",
        unit: "°C",
        minThreshold: 20,
        maxThreshold: 25,
        passed: true
      },
      {
        parameter: "pH Level",
        value: "6.8",
        unit: "pH",
        minThreshold: 6.0,
        maxThreshold: 7.5,
        passed: true
      }
    ],
    extractedValues: 3,
    confidence: "high"
  },

  tabularReport: {
    parameters: [
      {
        parameter: "Moisture Content",
        value: "13.2",
        unit: "%",
        minThreshold: 10,
        maxThreshold: 14,
        passed: true
      },
      {
        parameter: "Temperature",
        value: "21.8",
        unit: "°C",
        minThreshold: 20,
        maxThreshold: 25,
        passed: true
      },
      {
        parameter: "pH Level",
        value: "6.9",
        unit: "pH",
        minThreshold: 6.0,
        maxThreshold: 7.5,
        passed: true
      }
    ],
    extractedValues: 3,
    confidence: "high"
  },

  failedReport: {
    parameters: [
      {
        parameter: "Moisture Content",
        value: "16.2",
        unit: "%",
        minThreshold: 10,
        maxThreshold: 14,
        passed: false
      },
      {
        parameter: "Temperature",
        value: "28.5",
        unit: "°C",
        minThreshold: 20,
        maxThreshold: 25,
        passed: false
      },
      {
        parameter: "pH Level",
        value: "8.1",
        unit: "pH",
        minThreshold: 6.0,
        maxThreshold: 7.5,
        passed: false
      }
    ],
    extractedValues: 3,
    confidence: "high"
  }
};

// Test function to validate AI extraction (for development/testing)
export const testAIExtraction = async (aiClient: any, reportText: string) => {
  try {
    const { processLabReportWithAI } = await import('@/services/aiLabReportService');
    const result = await processLabReportWithAI(reportText, aiClient);
    
    console.log('AI Extraction Result:', result);
    
    // Validate structure
    if (!result.parameters || !Array.isArray(result.parameters)) {
      throw new Error('Invalid result structure');
    }

    // Validate each parameter
    result.parameters.forEach((param, index) => {
      if (!param.parameter || !param.value || !param.unit) {
        throw new Error(`Invalid parameter at index ${index}`);
      }
    });

    return result;
  } catch (error) {
    console.error('AI Extraction Test Failed:', error);
    throw error;
  }
};

// Usage example:
/*
import { sampleLabReports, testAIExtraction } from './aiTestSamples';
import { createAIClient } from '@/services/aiLabReportService';

// Test the AI extraction
const runTest = async () => {
  const client = createAIClient();
  
  for (const [name, report] of Object.entries(sampleLabReports)) {
    if (typeof report === 'string') {
      console.log(`Testing: ${name}`);
      try {
        const result = await testAIExtraction(client, report);
        console.log(`✅ ${name}: Extracted ${result.extractedValues} parameters`);
      } catch (error) {
        console.log(`❌ ${name}: Failed - ${error.message}`);
      }
    }
  }
};

runTest();
*/