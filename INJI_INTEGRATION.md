# Inji Certify/Verify/Wallet Integration

This document outlines the comprehensive integration of Inji Certify, Verify, and Wallet components into the AgriQCert system for verifiable credential issuance, verification, and revocation.

## Overview

The integration enables AgriQCert to:
- Issue W3C Verifiable Credentials (VCs) for agricultural certificates
- Verify VCs using Inji Verify services
- Handle credential revocation
- Support both mock (development) and real (production) modes
- Process issuance jobs asynchronously via DB-polling worker

## Architecture

### Backend Components

#### 1. Inji Client (`src/services/injiClient.ts`)
HTTP wrapper for Inji API with automatic retry logic and mock fallback capability.

```typescript
interface InjiClient {
  issueVC(payload: IssueVCPayload): Promise<IssuanceResponse>;
  verifyVC(payload: VerifyVCPayload): Promise<VerificationResponse>;
  parseWebhook(payload: any): WebhookEvent;
}
```

**Features:**
- Exponential backoff retry logic
- Mock mode for development
- Comprehensive error handling
- Type-safe payload validation

#### 2. Issuance Worker (`src/workers/issuanceWorker.ts`)
DB-polling worker that processes VC issuance jobs asynchronously.

**Key Features:**
- Polls `issuance_jobs` collection every 5 seconds
- Processes jobs with exponential backoff on failures
- Updates certificate records with VC metadata
- Creates user notifications
- Graceful shutdown handling

**Process Flow:**
1. Worker claims pending job
2. Builds credential payload from certificate data
3. Calls Inji API to issue VC
4. Updates certificate with VC data
5. Creates success notification
6. Marks job as completed

#### 3. Database Models

**IssuanceJob Schema:**
```typescript
{
  certificateId: ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

**Certificate Extensions:**
```typescript
{
  vcMetadata?: {
    credentialId?: string;
    issuanceId?: string;
    issuer?: string;
    issuedAt?: Date;
    expiresAt?: Date;
    revoked?: boolean;
    revokedAt?: Date;
    revokedBy?: ObjectId;
    revocationReason?: string;
  }
}
```

**Revocation Model:**
```typescript
{
  certificateId: ObjectId;
  vcCredentialId: string;
  reason: string;
  revokedBy: ObjectId;
  revokedAt: Date;
  providerResponse?: any;
}
```

#### 4. REST API Endpoints

**VC Operations (`/api/vc/*`):**
- `POST /issue/:certificateId` - Queue VC issuance
- `POST /verify/cert/:certificateId` - Verify by certificate ID
- `POST /verify/qr` - Verify by QR payload
- `POST /revoke/:certificateId` - Revoke credential
- `POST /webhook` - Handle provider webhooks
- `GET /status/:certificateId` - Get issuance status
- `GET /history/:certificateId` - Get VC history
- `GET /queue/stats` - Queue statistics (admin only)

### Frontend Components

#### 1. API Client (`src/api/vcApi.ts`)
Type-safe HTTP client for VC operations with comprehensive error handling.

#### 2. React Query Hooks
- `useIssueVC` - Issue VC mutation with optimistic updates
- `useVerifyVC` - Verify VC mutation
- `useVCS` - List and manage VCs
- `useVCHistory` - Get VC history

#### 3. UI Components
- `QRScanner` - Camera-based QR code scanning
- `CertificateDetail` - Enhanced with VC issuance/status
- `Verify` - Comprehensive verification page with tabs
- `VerificationResultCard` - Rich verification result display

## Configuration

### Environment Variables

```bash
# Inji API Configuration
INJI_API_URL=https://api.inji.io
INJI_CLIENT_ID=your_client_id
INJI_CLIENT_SECRET=your_client_secret
INJI_ISSUER_ID=your_issuer_id

# Mock Mode (development)
INJI_MOCK_MODE=true
INJI_MOCK_DELAY=2000

# Worker Configuration
WORKER_POLL_INTERVAL=5000
WORKER_MAX_CONCURRENT_JOBS=3
WORKER_MAX_ATTEMPTS=3
```

### Mock vs Real Mode

**Mock Mode (Development):**
- `INJI_MOCK_MODE=true`
- Returns simulated responses
- No external API calls
- Configurable delays for testing

**Real Mode (Production):**
- `INJI_MOCK_MODE=false`
- Makes actual Inji API calls
- Requires valid credentials
- Full error handling

## Usage

### 1. Starting the System

```bash
# Backend with worker
cd backend
npm run dev:all

# Frontend
cd frontend
npm run dev
```

### 2. Issuing a VC

```typescript
// Automatic on certificate creation/approval
const mutation = useIssueVC();
mutation.mutate(certificateId);
```

### 3. Verifying a VC

```typescript
// By certificate ID
const result = await verifyVC.mutateAsync({
  certificateId: 'CERT-2024-001'
});

// By QR code
const result = await verifyVC.mutateAsync({
  qrPayload: qrCodeData
});
```

### 4. Revoking a VC

```typescript
const result = await revokeVC.mutateAsync({
  certificateId: 'CERT-2024-001',
  reason: 'Certificate invalidated'
});
```

## QR Code Integration

### QR Code Data Structure

```typescript
interface QRCodeData {
  type: 'AgriQCert';
  certId: string;
  batchId?: string;
  verifyUrl: string;
  vcData?: {
    credentialId: string;
    issuer: string;
    issuedAt: string;
  };
}
```

### Verification Flow

1. **Scan QR Code** → Extract embedded data
2. **Verify Signature** → Validate cryptographic proof
3. **Check Revocation** → Query revocation registry
4. **Display Result** → Show verification status

## Testing

### Development Testing

1. **Mock Mode Testing:**
   ```bash
   # Set mock mode
   echo "INJI_MOCK_MODE=true" >> backend/.env
   
   # Test issuance
   curl -X POST localhost:3000/api/vc/issue/CERT-2024-001
   
   # Test verification
   curl -X POST localhost:3000/api/vc/verify/cert/CERT-2024-001
   ```

2. **Frontend Testing:**
   - Navigate to `/verify`
   - Use demo certificate ID: `CERT-2024-001`
   - Try QR scanner with demo data
   - Test all verification methods

### Integration Testing

1. **Worker Processing:**
   ```bash
   # Check job status
   curl localhost:3000/api/vc/queue/stats
   
   # Monitor logs
   npm run worker
   ```

2. **End-to-End Flow:**
   - Create certificate
   - Verify VC issuance job created
   - Wait for worker processing
   - Verify VC metadata updated
   - Test verification flow

## Security Considerations

### API Security
- JWT authentication required for all operations
- Role-based access control (RBAC)
- Input validation with Zod schemas
- Rate limiting on verification endpoints

### Credential Security
- Cryptographic signature validation
- Revocation registry checks
- Secure key management
- Audit logging for all operations

### Data Privacy
- Minimal data exposure in VCs
- Secure storage of sensitive data
- GDPR compliance considerations
- User consent for data sharing

## Monitoring & Observability

### Metrics
- Issuance job processing times
- Verification success/failure rates
- API response times
- Worker health status

### Logging
- Structured logging with correlation IDs
- Error tracking and alerting
- Audit logs for compliance
- Performance monitoring

### Health Checks
- API endpoint health
- Worker process monitoring
- Database connectivity
- External service availability

## Troubleshooting

### Common Issues

1. **Worker Not Processing Jobs:**
   - Check database connectivity
   - Verify WORKER_* environment variables
   - Check for stuck jobs: `db.issuance_jobs.find({status: 'processing'})`

2. **Verification Failures:**
   - Validate API credentials
   - Check network connectivity to Inji services
   - Verify certificate data integrity

3. **Mock Mode Not Working:**
   - Ensure `INJI_MOCK_MODE=true` in environment
   - Check mock response configurations
   - Verify client initialization

### Debug Commands

```bash
# Check worker status
npm run worker -- --debug

# Test API connectivity
curl -v localhost:3000/api/vc/queue/stats

# View recent jobs
mongo agriqcert --eval "db.issuance_jobs.find().sort({createdAt: -1}).limit(10)"
```

## Production Deployment

### Prerequisites
- Valid Inji API credentials
- MongoDB cluster
- Node.js 18+
- PM2 or similar process manager

### Deployment Steps

1. **Configure Environment:**
   ```bash
   INJI_MOCK_MODE=false
   INJI_API_URL=https://production.inji.io
   INJI_CLIENT_ID=prod_client_id
   INJI_CLIENT_SECRET=prod_secret
   ```

2. **Start Services:**
   ```bash
   # API server
   pm2 start dist/server.js --name "agriqcert-api"
   
   # Worker process
   pm2 start dist/workers/issuanceWorker.js --name "agriqcert-worker"
   ```

3. **Configure Monitoring:**
   - Set up health checks
   - Configure alerting
   - Enable performance monitoring

## API Reference

See [API_TESTING.md](./backend/API_TESTING.md) for complete API documentation including VC endpoints.

## Support

For technical support or questions about the Inji integration:

1. Check this documentation
2. Review API logs and worker status
3. Test in mock mode first
4. Contact the development team

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Status:** Production Ready