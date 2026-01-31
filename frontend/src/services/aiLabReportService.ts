import OpenAI from 'openai';

// OpenRouter AI client configuration
export const createAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('VITE_OPENROUTER_API_KEY environment variable is not set');
  }

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
};

// Enhanced text extraction with support for multiple file types
export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log('[Text Extraction] Starting extraction for file:', file.name, 'Type:', file.type, 'Size:', file.size);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          // Handle PDF files
          console.log('[Text Extraction] Processing PDF file...');
          if (content instanceof ArrayBuffer) {
            try {
              console.log('[Text Extraction] Loading PDF.js library...');
              // Dynamic import of pdfjs-dist - browser-compatible PDF library
              const pdfjsLib = await import('pdfjs-dist');
              
              // Set up worker for PDF.js (required for browser)
              // For Vite, we can use the worker from node_modules via a URL import
              // This ensures the worker is bundled and served correctly
              if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                try {
                  // Try to import worker as URL (Vite will handle this)
                  const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
                  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;
                  console.log('[Text Extraction] PDF.js worker loaded from node_modules');
                } catch (workerImportError) {
                  // Fallback to unpkg CDN
                  console.warn('[Text Extraction] Worker import failed, using CDN fallback:', workerImportError);
                  const version = pdfjsLib.version || '5.4.530';
                  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
                  console.log('[Text Extraction] PDF.js worker configured from CDN:', pdfjsLib.GlobalWorkerOptions.workerSrc);
                }
              }
              
              console.log('[Text Extraction] Loading PDF document...');
              // Load the PDF document
              const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(content),
                useSystemFonts: true
              });
              
              const pdfDocument = await loadingTask.promise;
              console.log('[Text Extraction] PDF loaded. Pages:', pdfDocument.numPages);
              
              // Extract text from all pages
              let fullText = '';
              for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                console.log(`[Text Extraction] Extracting text from page ${pageNum}/${pdfDocument.numPages}...`);
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Combine all text items from the page
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(' ');
                
                fullText += pageText + '\n';
              }
              
              console.log('[Text Extraction] PDF text extracted successfully. Text length:', fullText.length);
              
              if (!fullText || fullText.trim().length === 0) {
                console.error('[Text Extraction] PDF appears to be empty or contains no extractable text');
                reject(new Error('PDF file appears to be empty or contains no readable text. The PDF might be image-based or password protected. Please ensure the PDF has extractable text content.'));
                return;
              }
              
              console.log('[Text Extraction] PDF text preview:', fullText.substring(0, 200) + '...');
              resolve(fullText.trim());
              return;
            } catch (pdfError: any) {
              console.error('[Text Extraction] PDF parsing error:', pdfError);
              
              let errorMessage = 'Failed to parse PDF file. ';
              if (pdfError.message) {
                if (pdfError.message.includes('password')) {
                  errorMessage += 'The PDF is password protected. Please provide an unlocked version.';
                } else if (pdfError.message.includes('Invalid PDF')) {
                  errorMessage += 'The file is not a valid PDF or is corrupted.';
                } else {
                  errorMessage += pdfError.message;
                }
              } else {
                errorMessage += 'Please ensure the PDF is not password protected and contains readable text.';
              }
              
              reject(new Error(errorMessage));
              return;
            }
          } else {
            console.error('[Text Extraction] Invalid PDF content type:', typeof content);
            reject(new Error('Invalid PDF file format'));
            return;
          }
        }
        
        if (typeof content === 'string') {
          console.log('[Text Extraction] Text file extracted. Length:', content.length);
          resolve(content);
        } else if (content instanceof ArrayBuffer) {
          // Convert ArrayBuffer to text
          const text = new TextDecoder('utf-8').decode(content);
          console.log('[Text Extraction] ArrayBuffer converted to text. Length:', text.length);
          resolve(text);
        } else {
          console.error('[Text Extraction] Unable to extract text - unknown content type:', typeof content);
          reject(new Error('Unable to extract text from file'));
        }
      } catch (error) {
        console.error('[Text Extraction] Error during extraction:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('[Text Extraction] FileReader error:', error);
      reject(error);
    };
    
    // Handle different file types
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      console.log('[Text Extraction] Reading PDF as ArrayBuffer...');
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
      console.log('[Text Extraction] Reading as text file...');
      reader.readAsText(file);
    } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      console.log('[Text Extraction] Reading as JSON file...');
      reader.readAsText(file);
    } else {
      // Try to read as text for other formats
      console.log('[Text Extraction] Attempting to read as text (unknown format)...');
      reader.readAsText(file);
    }
  });
};

// System prompt for agricultural lab report parameter extraction
export const createLabReportSystemPrompt = () => {
  return `You are an AI assistant that extracts quality parameters from agricultural lab reports. Return ONLY valid JSON, no explanations.

PRIORITY PARAMETERS (extract first if present):
1. Moisture Content (%) - search: "moisture", "MC", "water content" 
2. Temperature (°C) - search: "temperature", "temp", "°C"
3. pH Level (pH) - search: "pH", "ph", "acidity"

ADDITIONAL PARAMETERS (up to 3 more if space allows):
- Protein Content (%), Fat Content (%), Ash Content (%)
- Aflatoxin (ppb), Pesticide Residue (ppm), Mycotoxin (ppb)  
- Broken Grains (%), Foreign Matter (%), Grain Size (mm)

RULES:
- Extract MAXIMUM 5-6 parameters total
- Return ONLY JSON in exact format below
- Value field: numbers only (no units)
- Unit field: REQUIRED for each parameter (%, °C, pH, ppm, ppb, mm, etc.)
- Search entire document for parameters

JSON FORMAT:
{
  "parameters": [
    {
      "parameter": "Moisture Content",
      "value": "12.5", 
      "unit": "%",
      "minThreshold": 10,
      "maxThreshold": 14
    }
  ],
  "extractedValues": 1,
  "confidence": "high",
  "notes": "Brief summary"
}`;
};

// Retry with fallback model when primary model fails
const retryWithFallbackModel = async (
  reportText: string,
  client: OpenAI
): Promise<{
  parameters: Array<{
    parameter: string;
    value: string;
    unit: string;
    minThreshold?: number | null;
    maxThreshold?: number | null;
  }>;
  extractedValues: number;
  confidence: string;
  notes?: string;
}> => {
  console.log('[AI Service] Attempting retry with fallback model...');
  
  // Try a different model that might be more reliable
  const fallbackPayload = {
    model: 'microsoft/wizardlm-2-8x22b:free', // Alternative free model
    messages: [
      {
        role: 'system',
        content: 'Extract quality parameters from agricultural lab reports. Return only valid JSON with parameters array.'
      },
      {
        role: 'user', 
        content: `Extract up to 3 key quality parameters (Moisture %, Temperature °C, pH) from this lab report. Return JSON only: {"parameters": [{"parameter": "name", "value": "number", "unit": "unit", "minThreshold": null, "maxThreshold": null}], "extractedValues": 1, "confidence": "medium", "notes": "brief summary"}

Lab Report:
${reportText.substring(0, 2000)}` // Truncate to avoid token limits
      }
    ],
    temperature: 0.1,
    max_tokens: 1500,
    reasoning: { enabled: false }
  };

  try {
    const fallbackResponse = await client.chat.completions.create(fallbackPayload);
    
    if (fallbackResponse.choices?.[0]?.message?.content) {
      let content = fallbackResponse.choices[0].message.content.trim();
      
      // Clean JSON response
      if (content.startsWith('```json')) {
        content = content.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
      
      const data = JSON.parse(content);
      
      if (data.parameters && Array.isArray(data.parameters)) {
        console.log('[AI Service] Fallback model succeeded with', data.parameters.length, 'parameters');
        return {
          parameters: data.parameters,
          extractedValues: data.parameters.length,
          confidence: 'low', // Mark as low confidence since it was a fallback
          notes: (data.notes || '') + ' (extracted using fallback model due to truncation)'
        };
      }
    }
    
    throw new Error('Fallback model also failed to extract parameters');
    
  } catch (fallbackError) {
    console.error('[AI Service] Fallback model failed:', fallbackError);
    
    // Last resort: return default structure with error message
    throw new Error(
      'AI processing failed: Both primary and fallback models were unable to process this document. The report may be too complex or in an unsupported format. Please try with a simpler text-based report or split the content into smaller sections.'
    );
  }
};

// Process lab report with AI and extract parameters
export const processLabReportWithAI = async (
  reportText: string,
  client: OpenAI
): Promise<{
  parameters: Array<{
    parameter: string;
    value: string;
    unit: string;
    minThreshold?: number | null;
    maxThreshold?: number | null;
  }>;
  extractedValues: number;
  confidence: string;
  notes?: string;
}> => {
  try {
    if (!reportText.trim()) {
      throw new Error('Empty report text provided');
    }

    // Log the extracted text length for debugging
    console.log('[AI Service] Extracted text length:', reportText.length);
    console.log('[AI Service] Extracted text preview:', reportText.substring(0, 200) + '...');

    // Prepare the request payload
    // Try a more reliable model if the free one fails
    const requestPayload: any = {
      model: 'nvidia/nemotron-3-nano-30b-a3b:free',
      messages: [
        {
          role: 'system',
          content: createLabReportSystemPrompt()
        },
        {
          role: 'user', 
          content: `Extract quality parameters from this agricultural lab report. Return ONLY valid JSON in the exact format specified.

PRIORITY PARAMETERS (extract if present):
1. Moisture Content (%)
2. Temperature (°C) 
3. pH Level

ADDITIONAL PARAMETERS (up to 3 more):
Extract any other measurable quality metrics: Protein, Fat, Ash, Pesticide Residue, Aflatoxin, Grain Quality, etc.

REQUIREMENTS:
- Extract maximum 5-6 parameters total
- Return ONLY JSON, no explanations or reasoning
- Use exact format from system prompt
- Include numerical values and units only

Lab Report Text:
${reportText}

Return JSON now:`
        }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 4000, // Increased significantly to handle verbose responses
      reasoning: { enabled: false } // Explicitly disable reasoning to save tokens
    };

    console.log('[AI Service] Sending request to Open Router...');
    console.log('[AI Service] Request payload:', {
      model: requestPayload.model,
      messageCount: requestPayload.messages.length,
      textLength: reportText.length
    });

    const response = await client.chat.completions.create(requestPayload);

    console.log('[AI Service] Received response from Open Router');
    console.log('[AI Service] Full response structure:', {
      hasChoices: !!response.choices,
      choicesLength: response.choices?.length || 0,
      firstChoice: response.choices?.[0],
      message: response.choices?.[0]?.message,
      content: response.choices?.[0]?.message?.content,
      finishReason: response.choices?.[0]?.finish_reason,
      usage: response.usage
    });
    
    // Handle different response structures
    let aiResponse: string | null = null;
    
    // Try standard structure first
    if (response.choices && response.choices.length > 0) {
      const firstChoice = response.choices[0];
      
      // Check for content in message
      if (firstChoice.message?.content) {
        aiResponse = firstChoice.message.content;
      }
      // Check if there's a finish reason that indicates an issue
      else if (firstChoice.finish_reason) {
        if (firstChoice.finish_reason === 'length') {
          // Try to extract partial JSON if available
          const partialContent = firstChoice.message?.content || '';
          console.warn('[AI Service] Response truncated due to length. Partial content:', partialContent.substring(0, 200));
          
          // If we have some content, try to parse it anyway
          if (partialContent.trim()) {
            console.log('[AI Service] Attempting to parse partial response...');
            try {
              // Try to parse the partial content as is
              let cleanedPartial = partialContent.trim();
              // If it looks like incomplete JSON, try to complete it
              if (cleanedPartial.includes('{') && !cleanedPartial.includes('}}')) {
                // Incomplete object - try to close it
                console.log('[AI Service] Attempting to close incomplete JSON...');
                if (cleanedPartial.endsWith(',')) {
                  cleanedPartial = cleanedPartial.slice(0, -1); // Remove trailing comma
                }
                if (!cleanedPartial.endsWith('}')) {
                  cleanedPartial += '}';
                }
                if (cleanedPartial.includes('"parameters":[') && !cleanedPartial.includes(']}')) {
                  cleanedPartial += ']}';
                }
              }
              
              // Clean markdown if present
              if (cleanedPartial.startsWith('```json')) {
                cleanedPartial = cleanedPartial.replace(/```json\n?/, '').replace(/\n?```$/, '');
              }
              
              const partialData = JSON.parse(cleanedPartial);
              if (partialData.parameters && Array.isArray(partialData.parameters) && partialData.parameters.length > 0) {
                console.log('[AI Service] Successfully parsed partial response with', partialData.parameters.length, 'parameters');
                // Set the response for further processing
                aiResponse = cleanedPartial;
              } else {
                throw new Error('Partial response does not contain valid parameters');
              }
            } catch (parseError) {
              console.error('[AI Service] Failed to parse partial response:', parseError);
              console.log('[AI Service] Trying fallback model due to truncation...');
              return await retryWithFallbackModel(reportText, client);
            }
          } else {
            console.log('[AI Service] No content in truncated response, trying fallback model...');
            return await retryWithFallbackModel(reportText, client);
          }
        } else if (firstChoice.finish_reason === 'content_filter') {
          throw new Error('AI response was filtered. Please check the lab report content.');
        } else if (firstChoice.finish_reason === 'stop' && !firstChoice.message?.content) {
          throw new Error('AI model returned empty response. The model may not support this request format.');
        }
      }
      
      // Check for tool calls or other response types
      if (!aiResponse && firstChoice.message?.tool_calls) {
        console.warn('[AI Service] Response contains tool calls instead of content:', firstChoice.message.tool_calls);
        throw new Error('AI model returned tool calls instead of text content. This model may require a different request format.');
      }
    }
    
    if (!aiResponse) {
      console.error('[AI Service] No response content found. Response:', JSON.stringify(response, null, 2));
      console.log('[AI Service] Attempting fallback due to empty response...');
      return await retryWithFallbackModel(reportText, client);
    }

    console.log('[AI Service] AI response length:', aiResponse.length);
    console.log('[AI Service] AI response preview:', aiResponse.substring(0, 300) + '...');

    // Clean and parse the JSON response
    let cleanedResponse = aiResponse.trim();
    
    // Remove any markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Attempt to parse the response
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[AI Service] JSON parsing failed:', parseError);
      console.log('[AI Service] Raw response:', cleanedResponse.substring(0, 500));
      console.log('[AI Service] Attempting fallback due to parsing error...');
      return await retryWithFallbackModel(reportText, client);
    }
    
    console.log('[AI Service] Parsed data:', parsedData);
    
    // Validate the response structure
    if (!parsedData.parameters || !Array.isArray(parsedData.parameters)) {
      console.error('[AI Service] Invalid response structure - missing parameters array');
      throw new Error('Invalid response format: missing parameters array');
    }

    console.log('[AI Service] Found', parsedData.parameters.length, 'parameters');

    // Enforce maximum parameter limit (5-6 parameters)
    const MAX_PARAMETERS = 6;
    if (parsedData.parameters.length > MAX_PARAMETERS) {
      console.warn(`[AI Service] Too many parameters (${parsedData.parameters.length}). Limiting to top ${MAX_PARAMETERS} most important.`);
      
      // Prioritize: preferred parameters first, then by importance
      const preferredNames = ['Moisture Content', 'Temperature', 'pH Level'];
      
      // Separate preferred and additional parameters
      const preferred = parsedData.parameters.filter(p => 
        preferredNames.some(name => p.parameter.toLowerCase().includes(name.toLowerCase()))
      );
      const additional = parsedData.parameters.filter(p => 
        !preferredNames.some(name => p.parameter.toLowerCase().includes(name.toLowerCase()))
      );
      
      // Priority order for additional: Safety > Nutritional > Physical > Other
      const safetyKeywords = ['aflatoxin', 'mycotoxin', 'pesticide', 'heavy metal', 'toxin', 'residue'];
      const nutritionalKeywords = ['protein', 'fat', 'ash', 'fiber', 'starch', 'amylose'];
      const physicalKeywords = ['broken', 'grain size', 'foreign matter', 'color', 'odor'];
      
      const sortByPriority = (a: any, b: any) => {
        const aIsSafety = safetyKeywords.some(k => a.parameter.toLowerCase().includes(k));
        const bIsSafety = safetyKeywords.some(k => b.parameter.toLowerCase().includes(k));
        if (aIsSafety && !bIsSafety) return -1;
        if (!aIsSafety && bIsSafety) return 1;
        
        const aIsNutritional = nutritionalKeywords.some(k => a.parameter.toLowerCase().includes(k));
        const bIsNutritional = nutritionalKeywords.some(k => b.parameter.toLowerCase().includes(k));
        if (aIsNutritional && !bIsNutritional) return -1;
        if (!aIsNutritional && bIsNutritional) return 1;
        
        return 0;
      };
      
      additional.sort(sortByPriority);
      
      // Take preferred + top additional to reach MAX_PARAMETERS
      const remainingSlots = MAX_PARAMETERS - preferred.length;
      const selectedAdditional = additional.slice(0, Math.max(0, remainingSlots));
      
      parsedData.parameters = [...preferred, ...selectedAdditional];
      parsedData.extractedValues = parsedData.parameters.length;
      
      console.log(`[AI Service] Limited to ${parsedData.parameters.length} parameters:`, 
        parsedData.parameters.map(p => p.parameter));
    }

    // Validate each parameter
    parsedData.parameters.forEach((param: any, index: number) => {
      if (!param.parameter || !param.value) {
        console.error('[AI Service] Invalid parameter at index', index, param);
        throw new Error(`Invalid parameter at index ${index}: missing required fields (parameter or value)`);
      }
      
      // Auto-correct missing units for known parameters
      if (!param.unit || param.unit.trim() === '') {
        const paramLower = param.parameter.toLowerCase();
        if (paramLower.includes('moisture')) {
          param.unit = '%';
        } else if (paramLower.includes('temperature')) {
          param.unit = '°C';
        } else if (paramLower.includes('ph')) {
          param.unit = 'pH';
        } else if (paramLower.includes('protein') || paramLower.includes('fat') || paramLower.includes('ash')) {
          param.unit = '%';
        } else if (paramLower.includes('aflatoxin') || paramLower.includes('mycotoxin')) {
          param.unit = 'ppb';
        } else {
          // For unknown parameters, set a generic unit or leave as provided
          param.unit = param.unit || 'units';
        }
        console.log(`[AI Service] Auto-corrected missing unit for ${param.parameter}: ${param.unit}`);
      }
      
      // Ensure value is a string and contains only valid numbers (allow decimals and negative)
      if (!/^-?\d+\.?\d*$/.test(param.value.toString())) {
        console.error('[AI Service] Invalid value format at index', index, 'value:', param.value);
        throw new Error(`Invalid value format at index ${index}: ${param.value} (must be a number)`);
      }
      
      // Thresholds are optional for dynamic parameters
      if (param.minThreshold != null && typeof param.minThreshold !== 'number') {
        console.warn('[AI Service] Invalid minThreshold at index', index, 'setting to null');
        param.minThreshold = null;
      }
      if (param.maxThreshold != null && typeof param.maxThreshold !== 'number') {
        console.warn('[AI Service] Invalid maxThreshold at index', index, 'setting to null');
        param.maxThreshold = null;
      }
    });

    console.log('[AI Service] Successfully processed', parsedData.parameters.length, 'parameters');
    return parsedData;
    
  } catch (error) {
    console.error('AI processing error:', error);
    
    // Provide more specific error messages
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response as JSON. The AI may have returned invalid format.');
    } else if (error instanceof Error) {
      throw new Error(`AI processing failed: ${error.message}`);
    } else {
      throw new Error('Unknown error occurred during AI processing');
    }
  }
};

// Validate extracted parameters against expected ranges
export const validateExtractedParameters = (parameters: Array<{
  parameter: string;
  value: string;
  unit: string;
  minThreshold?: number | null;
  maxThreshold?: number | null;
}>) => {
  return parameters.map(param => {
    const numValue = parseFloat(param.value);
    
    // If thresholds are provided, validate against them
    // If thresholds are null/undefined, mark as passed (no validation criteria)
    let passed = true;
    if (param.minThreshold != null && param.maxThreshold != null) {
      passed = numValue >= param.minThreshold && numValue <= param.maxThreshold;
    } else if (param.minThreshold != null) {
      passed = numValue >= param.minThreshold;
    } else if (param.maxThreshold != null) {
      passed = numValue <= param.maxThreshold;
    }
    // If both thresholds are null/undefined, passed remains true (no criteria to fail)
    
    return {
      ...param,
      passed,
      numericValue: numValue,
      // Ensure thresholds are numbers or undefined (not null)
      minThreshold: param.minThreshold ?? undefined,
      maxThreshold: param.maxThreshold ?? undefined
    };
  });
};