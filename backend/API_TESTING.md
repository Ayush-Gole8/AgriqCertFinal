# AgriQCert API Testing Guide

Quick guide to test the API endpoints using PowerShell or any HTTP client.

## Setup

1. Ensure backend is running: `npm run dev`
2. Server should be at: `http://localhost:5000`

## Test Flow

### 1. Register a Farmer

```powershell
$registerBody = @{
    email = "testfarmer@example.com"
    password = "TestPass123!"
    name = "Test Farmer"
    role = "farmer"
    organization = "Test Farm"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
$accessToken = $response.data.tokens.accessToken
$refreshToken = $response.data.tokens.refreshToken

Write-Host "✅ Registered successfully!"
Write-Host "Access Token: $accessToken"
```

### 2. Login

```powershell
$loginBody = @{
    email = "testfarmer@example.com"
    password = "TestPass123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$accessToken = $response.data.tokens.accessToken

Write-Host "✅ Logged in successfully!"
```

### 3. Get Profile

```powershell
$headers = @{
    "Authorization" = "Bearer $accessToken"
}

$profile = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/profile" -Method GET -Headers $headers
Write-Host "Profile: $($profile.data.user | ConvertTo-Json)"
```

### 4. Create a Batch

```powershell
$batchBody = @{
    productType = "Vegetables"
    productName = "Organic Carrots"
    quantity = 250
    unit = "kg"
    harvestDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    location = @{
        latitude = 36.7783
        longitude = -119.4179
        address = "123 Farm Road"
        region = "Central Valley"
    }
} | ConvertTo-Json

$batch = Invoke-RestMethod -Uri "http://localhost:5000/api/batches" -Method POST -Body $batchBody -ContentType "application/json" -Headers $headers
$batchId = $batch.data.batch.id

Write-Host "✅ Batch created! ID: $batchId"
```

### 5. Get All Batches

```powershell
$batches = Invoke-RestMethod -Uri "http://localhost:5000/api/batches?page=1&limit=10" -Method GET -Headers $headers
Write-Host "Batches: $($batches.data.data.Count) found"
```

### 6. Get Batch by ID

```powershell
$batch = Invoke-RestMethod -Uri "http://localhost:5000/api/batches/$batchId" -Method GET -Headers $headers
Write-Host "Batch: $($batch.data.batch.productName)"
```

### 7. Update Batch

```powershell
$updateBody = @{
    quantity = 300
    notes = "Updated quantity"
} | ConvertTo-Json

$updated = Invoke-RestMethod -Uri "http://localhost:5000/api/batches/$batchId" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $headers
Write-Host "✅ Batch updated!"
```

### 8. Submit Batch

```powershell
$submitted = Invoke-RestMethod -Uri "http://localhost:5000/api/batches/$batchId/submit" -Method POST -Headers $headers -ContentType "application/json"
Write-Host "✅ Batch submitted for inspection!"
```

### 9. Get Batch Statistics

```powershell
$stats = Invoke-RestMethod -Uri "http://localhost:5000/api/batches/stats" -Method GET -Headers $headers
Write-Host "Statistics: $($stats.data | ConvertTo-Json)"
```

### 10. Refresh Token

```powershell
$refreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

$newTokens = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/refresh" -Method POST -Body $refreshBody -ContentType "application/json"
$accessToken = $newTokens.data.tokens.accessToken

Write-Host "✅ Token refreshed!"
```

### 11. Logout

```powershell
$logoutBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/logout" -Method POST -Body $logoutBody -ContentType "application/json" -Headers $headers
Write-Host "✅ Logged out successfully!"
```

## Using cURL (Cross-platform)

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testfarmer@example.com","password":"TestPass123!","name":"Test Farmer","role":"farmer"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testfarmer@example.com","password":"TestPass123!"}'
```

### Get Batches (with auth)
```bash
curl -X GET http://localhost:5000/api/batches \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Seeded Test Accounts

After running `npm run seed`, use these credentials:

### Admin
- Email: `admin@agriqcert.com`
- Password: `Admin@123456`

### Farmer
- Email: `farmer1@agriqcert.com`
- Password: `Farmer@123`

### QA Inspector
- Email: `inspector1@agriqcert.com`
- Password: `Inspector@123`

### Certifier
- Email: `certifier1@agriqcert.com`
- Password: `Certifier@123`

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Batch not found"
}
```

## Testing Tips

1. **Save tokens**: Store access and refresh tokens in variables for reuse
2. **Check expiry**: Access tokens expire in 15 minutes
3. **Use refresh**: Use refresh token to get new access token
4. **Role testing**: Create users with different roles to test permissions
5. **MongoDB Compass**: View data in real-time as you make requests

## Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

Should return:
```json
{
  "success": true,
  "message": "AgriQCert API is running",
  "timestamp": "2024-12-09T..."
}
```
