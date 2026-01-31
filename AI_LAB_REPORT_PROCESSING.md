# AI-Powered Lab Report Processing

## Overview

The inspection system now includes AI-powered automatic parameter extraction from lab reports. This feature allows inspectors to upload lab report files and automatically populate inspection readings using OpenRouter AI.

## Features

- **Automatic Parameter Extraction**: AI extracts moisture content, temperature, and pH level from lab reports
- **Multiple File Format Support**: Supports .txt, .json, .pdf, .doc, and other text-based formats
- **Intelligent Parsing**: Uses advanced AI to understand various lab report formats
- **Quality Validation**: Automatically validates extracted values against thresholds
- **Offline Support**: Works with the existing offline inspection capabilities
- **Error Handling**: Robust error handling with clear user feedback

## Setup

### 1. Environment Configuration

Create or update `.env.local` in the frontend directory:

```bash
# OpenRouter AI API Configuration
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 2. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env.local` file

### 3. Install Dependencies

The system uses the OpenAI SDK for OpenRouter integration and pdf-parse for PDF processing:

```bash
cd frontend
npm install openai pdf-parse
```

## Usage

### For Inspectors

1. **Navigate to Inspection Detail**: Open any batch inspection
2. **Upload Lab Report**: Click the "AI Extract" button in the Quality Readings section
3. **Select File**: Choose a lab report file (.txt, .json, or other text format)
4. **AI Processing**: The system will automatically:
   - Extract text from the file
   - Send to AI for parameter extraction
   - Populate the inspection readings
   - Validate against quality thresholds
5. **Review Results**: Check the extracted parameters and make adjustments if needed
6. **Complete Inspection**: Save or complete the inspection as normal

### Supported Parameters

The AI automatically extracts these parameters:

- **Moisture Content**: Percentage (10-14% range)
- **Temperature**: Degrees Celsius (20-25°C range)
- **pH Level**: pH scale (6.0-7.5 range)

### File Format Examples

#### Text File Format (.txt)
```
Agricultural Quality Analysis Report
Sample ID: AGR-2024-001
Date: 2024-01-31

Quality Parameters:
- Moisture Content: 12.5%
- Temperature: 22.3°C
- pH Level: 6.8 pH

Analysis completed by certified lab.
```

#### PDF Format (.pdf)
```
Standard lab report in PDF format with quality parameters embedded in text.
The system will automatically extract readable text from the PDF.
```

#### JSON Format (.json)
```json
{
  "report": {
    "sampleId": "AGR-2024-001",
    "qualityParameters": {
      "moistureContent": "12.5%",
      "temperature": "22.3°C",
      "phLevel": "6.8"
    }
  }
}
```

## AI System Prompt

The system uses a specialized prompt that:

- Focuses on agricultural quality parameters
- Ensures consistent JSON output format
- Validates parameter ranges
- Provides confidence scoring
- Handles various report formats

## Error Handling

The system handles various error scenarios:

- **Invalid API Key**: Clear error message with setup instructions
- **File Processing Errors**: File size limits and format validation
- **AI Processing Errors**: Fallback handling for API failures
- **Parameter Validation**: Threshold checking and quality validation

## Offline Support

- AI processing requires internet connection
- Extracted data integrates with existing offline drafts
- Manual entry remains available as fallback

## Technical Implementation

### Architecture

```
File Upload → Text Extraction → AI Processing → Parameter Validation → UI Update
     ↓              ↓               ↓               ↓               ↓
   FileReader → extractText() → processWithAI() → validate() → setReadings()
```

### AI Service (`aiLabReportService.ts`)

- **`createAIClient()`**: Configures OpenRouter client
- **`extractTextFromFile()`**: Handles file parsing
- **`processLabReportWithAI()`**: AI parameter extraction
- **`validateExtractedParameters()`**: Quality threshold validation

### Integration Points

- **InspectionDetail.tsx**: Main UI component
- **Offline Support**: Integrates with existing draft system
- **Toast Notifications**: User feedback for all operations

## Future Enhancements

1. **PDF Support**: Add PDF parsing capabilities
2. **Custom Parameters**: Allow custom parameter definitions
3. **Batch Processing**: Support multiple file uploads
4. **Training Data**: Improve AI accuracy with domain-specific training
5. **OCR Integration**: Support for scanned documents
6. **Multi-language**: Support for different lab report languages

## Troubleshooting

### Common Issues

1. **AI Not Working**: Check API key configuration
2. **File Not Processing**: Ensure file is text-based format
3. **No Parameters Found**: Verify lab report contains standard quality metrics
4. **Extraction Errors**: Check file content and format

### Debug Mode

Enable console logging to debug AI processing:

```javascript
// In browser console
localStorage.setItem('debug-ai', 'true');
```

## Security Considerations

- API keys are stored in environment variables
- File content is processed client-side when possible
- AI processing includes rate limiting
- No sensitive data is logged or stored

## Performance

- File size limit: 5MB
- Processing time: 5-15 seconds typical
- Fallback to manual entry if AI fails
- Caching of successful extractions

This AI-powered feature significantly improves inspection efficiency while maintaining accuracy and quality standards.