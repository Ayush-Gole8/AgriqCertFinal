# AgriQCert Complete Workflow Test
# Tests: Create Batch → Complete Inspection → Issue Certificate → Get Issuance Offer URL

$ErrorActionPreference = "Stop"
$API_BASE = "http://localhost:5000/api"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "🚀 AgriQCert - Complete Inji Integration Workflow Test" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Step 1: Setup Users
Write-Host "📝 Step 1: Setting up users...`n" -ForegroundColor Yellow

# Register and login farmer
try {
    $farmerReg = @{
        email = "farmer-test@example.com"
        password = "Test1234!"
        name = "Test Farmer"
        role = "farmer"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$API_BASE/auth/register" -Method POST -Body $farmerReg -ContentType "application/json" | Out-Null
    Write-Host "✅ Registered farmer" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  Farmer already exists" -ForegroundColor Gray
}

$farmerLogin = @{
    email = "farmer-test@example.com"
    password = "Test1234!"
} | ConvertTo-Json

$farmerResp = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body $farmerLogin -ContentType "application/json"
$farmerToken = $farmerResp.data.accessToken
Write-Host "✅ Farmer logged in" -ForegroundColor Green

# Register and login inspector
try {
    $inspectorReg = @{
        email = "inspector-test@example.com"
        password = "Test1234!"
        name = "Test Inspector"
        role = "qa_inspector"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$API_BASE/auth/register" -Method POST -Body $inspectorReg -ContentType "application/json" | Out-Null
    Write-Host "✅ Registered inspector" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  Inspector already exists" -ForegroundColor Gray
}

$inspectorLogin = @{
    email = "inspector-test@example.com"
    password = "Test1234!"
} | ConvertTo-Json

$inspectorResp = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body $inspectorLogin -ContentType "application/json"
$inspectorToken = $inspectorResp.data.accessToken
Write-Host "✅ Inspector logged in" -ForegroundColor Green

# Register and login certifier
try {
    $certifierReg = @{
        email = "certifier-test@example.com"
        password = "Test1234!"
        name = "Test Certifier"
        role = "certifier"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$API_BASE/auth/register" -Method POST -Body $certifierReg -ContentType "application/json" | Out-Null
    Write-Host "✅ Registered certifier" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  Certifier already exists" -ForegroundColor Gray
}

$certifierLogin = @{
    email = "certifier-test@example.com"
    password = "Test1234!"
} | ConvertTo-Json

$certifierResp = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Body $certifierLogin -ContentType "application/json"
$certifierToken = $certifierResp.data.accessToken
Write-Host "✅ Certifier logged in`n" -ForegroundColor Green

# Step 2: Create Batch
Write-Host "🌾 Step 2: Creating batch...`n" -ForegroundColor Yellow

$batchData = @{
    productType = "grain"
    productName = "Organic Wheat"
    quantity = 1000
    unit = "kg"
    harvestDate = (Get-Date).ToString("yyyy-MM-dd")
    location = @{
        address = "123 Farm Road, Agricultural District"
        coordinates = @{
            lat = 28.6139
            lng = 77.2090
        }
    }
    certifications = @("organic", "quality_tested")
    notes = "Test batch for Inji integration workflow"
} | ConvertTo-Json -Depth 5

$farmerHeaders = @{
    "Authorization" = "Bearer $farmerToken"
    "Content-Type" = "application/json"
}

$batchResp = Invoke-RestMethod -Uri "$API_BASE/batches" -Method POST -Body $batchData -Headers $farmerHeaders
$batchId = $batchResp.data.id

Write-Host "✅ Batch created: $batchId" -ForegroundColor Green
Write-Host "   Product: $($batchResp.data.productName)" -ForegroundColor Gray
Write-Host "   Quantity: $($batchResp.data.quantity) $($batchResp.data.unit)`n" -ForegroundColor Gray

# Step 3: Create and Complete Inspection
Write-Host "🔍 Step 3: Creating and completing inspection...`n" -ForegroundColor Yellow

$inspectionData = @{
    batchId = $batchId
    inspectionDate = (Get-Date).ToString("yyyy-MM-dd")
    location = @{
        address = "Quality Lab, Agricultural District"
        coordinates = @{
            lat = 28.6139
            lng = 77.2090
        }
    }
    qualityMetrics = @{
        moistureContent = 12.5
        proteinContent = 13.2
        gradeAssigned = "A"
        overallScore = 95
    }
    testResults = @{
        pesticideTest = "Passed"
        heavyMetalTest = "Passed"
        aflatoxinTest = "Passed"
    }
    notes = "Inspection completed successfully"
    status = "completed"
    outcome = "approved"
} | ConvertTo-Json -Depth 5

$inspectorHeaders = @{
    "Authorization" = "Bearer $inspectorToken"
    "Content-Type" = "application/json"
}

$inspectionResp = Invoke-RestMethod -Uri "$API_BASE/inspections" -Method POST -Body $inspectionData -Headers $inspectorHeaders
$inspectionId = $inspectionResp.data.id

Write-Host "✅ Inspection created: $inspectionId" -ForegroundColor Green
Write-Host "   Status: $($inspectionResp.data.status)" -ForegroundColor Gray
Write-Host "   Outcome: $($inspectionResp.data.outcome)`n" -ForegroundColor Gray

# Step 4: Issue Certificate (Calls Inji Certify API)
Write-Host "📜 Step 4: Issuing certificate via Inji...`n" -ForegroundColor Yellow

$issueData = @{
    batchId = $batchId
    inspectionId = $inspectionId
} | ConvertTo-Json

$certifierHeaders = @{
    "Authorization" = "Bearer $certifierToken"
    "Content-Type" = "application/json"
}

$issueResp = Invoke-RestMethod -Uri "$API_BASE/vc/issue" -Method POST -Body $issueData -Headers $certifierHeaders
$jobId = $issueResp.data.jobId

Write-Host "✅ Issuance job created: $jobId" -ForegroundColor Green
Write-Host "   Status: $($issueResp.data.status)`n" -ForegroundColor Gray

# Step 5: Poll Job Status
Write-Host "⏳ Step 5: Waiting for certificate issuance...`n" -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0
$completed = $false

while ($attempt -lt $maxAttempts -and -not $completed) {
    Start-Sleep -Seconds 2
    $attempt++
    
    $jobResp = Invoke-RestMethod -Uri "$API_BASE/vc/jobs/$jobId" -Headers $certifierHeaders
    $status = $jobResp.data.status
    
    Write-Host "   Attempt $attempt/$maxAttempts - Status: $status" -ForegroundColor Gray
    
    if ($status -eq "completed") {
        $completed = $true
        $certificateId = $jobResp.data.certificateId
        
        Write-Host "`n✅ Certificate issued successfully!" -ForegroundColor Green
        Write-Host "   Certificate ID: $certificateId" -ForegroundColor Cyan
        
        # Get certificate details
        $certResp = Invoke-RestMethod -Uri "$API_BASE/vc/certificates/$certificateId" -Headers $certifierHeaders
        $cert = $certResp.data
        
        Write-Host "`n📋 Certificate Details:" -ForegroundColor Yellow
        Write-Host "   VC ID: $($cert.vcId)" -ForegroundColor Gray
        Write-Host "   VC URL: $($cert.vcUrl)" -ForegroundColor Gray
        Write-Host "   Status: $($cert.status)" -ForegroundColor Gray
        Write-Host "   Issued At: $($cert.issuedAt)" -ForegroundColor Gray
        
        # Check for wallet metadata and issuance offer URL
        if ($cert.walletMetadata) {
            Write-Host "`n📱 Wallet Integration:" -ForegroundColor Yellow
            Write-Host "   Push Status: $($cert.walletMetadata.pushStatus)" -ForegroundColor Gray
            
            if ($cert.walletMetadata.pushStatus -eq "not_linked") {
                Write-Host "`n🔗 Issuance Offer URL (Deeplink):" -ForegroundColor Cyan
                Write-Host "   $($cert.walletMetadata.deeplink)" -ForegroundColor White -BackgroundColor DarkBlue
                Write-Host "`n   📲 Scan this QR code or click the link to add to Inji Wallet" -ForegroundColor Gray
            } elseif ($cert.walletMetadata.pushStatus -eq "sent") {
                Write-Host "   ✅ Credential pushed to wallet successfully!" -ForegroundColor Green
                Write-Host "   Pushed At: $($cert.walletMetadata.pushedAt)" -ForegroundColor Gray
            } elseif ($cert.walletMetadata.deeplink) {
                Write-Host "`n🔗 Issuance Offer URL (Deeplink):" -ForegroundColor Cyan
                Write-Host "   $($cert.walletMetadata.deeplink)" -ForegroundColor White -BackgroundColor DarkBlue
            }
        }
        
        # Check for Inji issuance session URL
        if ($cert.injiMetadata -and $cert.injiMetadata.issuanceUrl) {
            Write-Host "`n🎫 Inji Issuance Session URL:" -ForegroundColor Cyan
            Write-Host "   $($cert.injiMetadata.issuanceUrl)" -ForegroundColor White -BackgroundColor DarkBlue
        }
        
        Write-Host "`n============================================================" -ForegroundColor Green
        Write-Host "✅ WORKFLOW COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "============================================================`n" -ForegroundColor Green
        
    } elseif ($status -eq "failed") {
        Write-Host "`n❌ Certificate issuance failed!" -ForegroundColor Red
        Write-Host "   Error: $($jobResp.data.error)" -ForegroundColor Red
        break
    }
}

if (-not $completed) {
    Write-Host "`n⚠️  Certificate issuance timed out after $maxAttempts attempts" -ForegroundColor Yellow
    Write-Host "   You can check the job status later at: $API_BASE/vc/jobs/$jobId" -ForegroundColor Gray
}
