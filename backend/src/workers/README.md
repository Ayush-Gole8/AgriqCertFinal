# AgriQCert Workers

This directory contains background workers that process jobs asynchronously without requiring external queue systems like Redis or Bull.

## Issuance Worker

The `issuanceWorker.ts` implements a DB-polling pattern to process Verifiable Credential issuance jobs.

### How it works

1. **Job Creation**: When a batch passes inspection or when manually triggered, an `IssuanceJob` document is created in MongoDB
2. **Polling**: The worker polls the database every `WORKER_POLL_INTERVAL_MS` milliseconds for pending jobs
3. **Claiming**: Jobs are atomically claimed to prevent duplicate processing across multiple worker instances
4. **Processing**: The worker builds credential payloads, calls the Inji client, and creates Certificate documents
5. **Completion**: Successful jobs create certificates and notifications; failed jobs are retried up to 3 times

### Configuration

Set these environment variables:

```bash
# How often to poll for new jobs (milliseconds)
WORKER_POLL_INTERVAL_MS=3000

# Maximum number of concurrent job processing
WORKER_CONCURRENCY=2

# Inji integration (can run in mock mode)
INJI_MOCK_MODE=true
INJI_API_URL=https://api.inji.example
INJI_API_KEY=sk_live_xxx
INJI_ISSUER_DID=did:example:agency-123
```

### Running the Worker

#### Development (Mock Mode)

```bash
# Start the worker in development mode (uses mocked Inji responses)
npm run worker

# Or with explicit mock mode
INJI_MOCK_MODE=true npm run worker

# Run backend and worker together
npm run dev:all
```

#### Production

```bash
# Ensure real Inji credentials are configured
export INJI_API_KEY=your_real_api_key
export INJI_MOCK_MODE=false

# Start the worker
npm run worker

# Or use a process manager like PM2
pm2 start "npm run worker" --name agriqcert-worker
```

### Worker Features

- **Graceful Shutdown**: Handles SIGTERM/SIGINT and waits for active jobs to complete
- **Retry Logic**: Failed jobs are automatically retried up to 3 times with exponential backoff
- **Concurrency Control**: Configurable number of concurrent job processing
- **Atomic Job Claiming**: Prevents race conditions when multiple workers run
- **Error Handling**: Detailed error logging and job failure tracking
- **TTL Cleanup**: Old jobs are automatically cleaned up after 30 days

### Job Lifecycle

```
pending → processing → success
    ↓         ↓
  failed ←────┘
    ↓
  (retry if attempts < 3)
```

### Monitoring

Check worker status and job queue:

```javascript
// Get pending jobs count
const pendingCount = await IssuanceJob.countDocuments({ status: 'pending' });

// Get failed jobs that can be retried
const retryableJobs = await IssuanceJob.find({ 
  status: 'failed', 
  attemptCount: { $lt: 3 } 
});

// Worker status (if running in same process)
const status = issuanceWorker.getStatus();
```

### Scaling

The worker supports horizontal scaling:

- Run multiple worker instances on different machines
- Each worker polls independently and claims jobs atomically
- MongoDB handles the coordination
- Configure `WORKER_CONCURRENCY` based on available resources

### No Redis Required

This implementation uses MongoDB as both the data store and job queue, eliminating the need for Redis or other external queue systems. Benefits:

- **Simplified Architecture**: One less service to manage
- **ACID Transactions**: Reliable job state management
- **Persistent Storage**: Jobs survive worker restarts
- **Native Queries**: Use MongoDB queries to inspect job status

### Troubleshooting

**Worker not processing jobs:**
- Check database connection
- Verify `WORKER_POLL_INTERVAL_MS` is reasonable (not too high)
- Ensure jobs are in `pending` status with `attemptCount < 3`

**Jobs failing repeatedly:**
- Check Inji client configuration (`INJI_API_KEY`, `INJI_API_URL`)
- Verify batch and inspection data integrity
- Check logs for specific error messages

**High memory usage:**
- Reduce `WORKER_CONCURRENCY`
- Monitor active job count
- Check for memory leaks in job processing logic