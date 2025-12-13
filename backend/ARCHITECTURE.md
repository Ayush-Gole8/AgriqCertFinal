# AgriQCert Backend - Architecture & Implementation Summary

## 🎯 Overview

A production-grade Node.js + Express + MongoDB backend for the AgriQCert Digital Product Passport system with complete authentication, role-based access control, and W3C Verifiable Credentials support.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/                 # Configuration management
│   │   ├── index.ts           # Centralized config with validation
│   │   └── database.ts        # MongoDB connection singleton
│   │
│   ├── models/                # Mongoose schemas & models
│   │   ├── User.ts           # User model with bcrypt hashing
│   │   ├── Batch.ts          # Agricultural batch tracking
│   │   ├── Inspection.ts     # QA inspection records
│   │   ├── Certificate.ts    # W3C Verifiable Credentials
│   │   ├── BatchDraft.ts     # Autosave functionality
│   │   ├── Notification.ts   # User notifications
│   │   ├── AuditLog.ts       # Compliance audit trail
│   │   └── index.ts          # Barrel exports
│   │
│   ├── controllers/           # Request handlers
│   │   ├── AuthController.ts # Authentication & user management
│   │   └── BatchController.ts # Batch CRUD operations
│   │
│   ├── routes/               # API route definitions
│   │   ├── auth.routes.ts   # /api/auth/* routes
│   │   ├── batch.routes.ts  # /api/batches/* routes
│   │   └── index.ts         # Route aggregation
│   │
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts          # JWT authentication & RBAC
│   │   ├── errorHandler.ts # Global error handling
│   │   └── validation.ts    # Zod schema validation
│   │
│   ├── validators/           # Validation schemas
│   │   └── schemas.ts       # Zod schemas for all endpoints
│   │
│   ├── utils/                # Utility functions
│   │   └── jwt.ts           # JWT generation & verification
│   │
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts         # Shared interfaces & types
│   │
│   ├── scripts/              # Utility scripts
│   │   └── seed.ts          # Database seeding
│   │
│   └── server.ts             # Application entry point
│
├── uploads/                   # File upload directory
├── .env                      # Environment variables
├── .env.example              # Environment template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── README.md                # Documentation
├── API_TESTING.md           # API testing guide
└── setup.ps1                # Quick setup script
```

## 🔐 Authentication & Authorization

### JWT Token Strategy

**Access Token:**
- Short-lived (15 minutes)
- Used for API authentication
- Contains: userId, email, role, type: 'access'

**Refresh Token:**
- Long-lived (7 days)
- Stored in database with user
- Used to obtain new access tokens
- Revoked on password change/logout

### Role-Based Access Control (RBAC)

| Role | Capabilities |
|------|-------------|
| **Farmer** | Create/edit own batches (draft only), submit for inspection, view certificates |
| **QA Inspector** | View all batches, create/complete inspections, geotag verification |
| **Certifier** | View approved batches, issue W3C Verifiable Credentials, revoke certificates |
| **Admin** | Full system access, user management, audit logs, override permissions |
| **Verifier** | Public verification of certificates via QR code (limited read access) |

### Security Features

✅ **Password Security:**
- Bcrypt hashing (12 rounds)
- Password complexity validation
- Secure password reset flow

✅ **Token Management:**
- Rotating refresh tokens
- Token blacklisting on logout
- Secure JWT secrets

✅ **API Security:**
- Helmet for security headers
- CORS with whitelist
- Rate limiting (100 req/15min)
- Request validation with Zod

## 🗄️ Database Design

### Schema Highlights

**Optimized Indexes:**
- Compound indexes for common queries
- Text search indexes for product search
- TTL indexes for auto-cleanup (drafts, notifications)
- Geospatial indexes for location queries

**Data Integrity:**
- Schema validation with Mongoose
- Unique constraints (email, certificate-batch)
- Foreign key references with populate
- Pre-save hooks for data consistency

**Audit Trail:**
- Every operation logged to AuditLog
- User, timestamp, IP, action tracked
- 2-year retention policy
- Immutable log records

### Relationships

```
User (1) ──┬─> (N) Batch
           ├─> (N) Inspection
           └─> (N) Certificate

Batch (1) ──┬─> (N) Inspection
            └─> (1) Certificate

Inspection (N) ──> (1) Batch
Certificate (1) ──> (1) Batch
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Create new account
- `POST /login` - Authenticate user
- `POST /refresh` - Refresh access token
- `POST /logout` - Invalidate tokens
- `GET /profile` - Get current user
- `PUT /profile` - Update profile
- `PUT /change-password` - Change password

### Batches (`/api/batches`)
- `GET /` - List batches (paginated, filtered)
- `GET /stats` - Batch statistics
- `GET /:id` - Get batch details
- `POST /` - Create batch (Farmer, Admin)
- `PUT /:id` - Update batch (Farmer, Admin)
- `POST /:id/submit` - Submit for inspection
- `DELETE /:id` - Delete draft batch

### Future Endpoints
- `/api/inspections` - Inspection management
- `/api/certificates` - Certificate issuance & verification
- `/api/notifications` - User notifications
- `/api/admin` - Admin operations
- `/api/drafts` - Draft management
- `/api/verify` - Public verification

## 🚀 Getting Started

### Prerequisites
```powershell
# Node.js >= 18
node --version

# MongoDB
mongod --version
```

### Installation
```powershell
# Navigate to backend
cd E:\Agriqcert\backend

# Install dependencies
npm install

# Setup environment
Copy-Item .env.example .env
# Edit .env with your configuration

# Start MongoDB (if not running)
mongod

# Seed database
npm run seed

# Start development server
npm run dev
```

### Quick Setup Script
```powershell
.\setup.ps1
```

## 🧪 Testing

### Manual Testing
See [API_TESTING.md](./API_TESTING.md) for PowerShell and cURL examples.

### Test Accounts (after seeding)
```
Admin:     admin@agriqcert.com / Admin@123456
Farmer:    farmer1@agriqcert.com / Farmer@123
Inspector: inspector1@agriqcert.com / Inspector@123
Certifier: certifier1@agriqcert.com / Certifier@123
```

## 📊 Database Schema Details

### User Schema
- **Indexes:** email (unique), role, isActive, createdAt
- **Features:** Password hashing, refresh token storage, email verification
- **Virtuals:** batches, inspections

### Batch Schema
- **Indexes:** farmerId, status, productType, createdAt, text search
- **Features:** Status workflow, geolocation, file attachments
- **Virtuals:** inspections, certificate
- **Constraints:** Max 20 attachments per batch

### Inspection Schema
- **Indexes:** batchId, inspectorId, status, overallResult
- **Features:** Parametric readings, geotag validation, photo evidence
- **Auto-calculation:** Overall result from readings
- **Constraints:** Max 50 photos per inspection

### Certificate Schema (W3C VC)
- **Indexes:** batchId (unique), qrCodeData, status, expiresAt
- **Features:** W3C Verifiable Credential format, QR generation, revocation
- **Auto-expiry:** TTL check on queries
- **Standards:** Compliant with W3C VC Data Model 1.1

## 🔧 Configuration

### Environment Variables
All configuration in `.env`:
- Database connection strings
- JWT secrets (auto-validation in production)
- CORS origins
- Upload limits
- Rate limiting
- Verifiable Credential DIDs

### Security Best Practices
1. ✅ Never commit `.env` to version control
2. ✅ Use strong JWT secrets (min 32 chars)
3. ✅ Enable HTTPS in production
4. ✅ Whitelist CORS origins
5. ✅ Regular security audits: `npm audit`
6. ✅ Keep dependencies updated
7. ✅ Use MongoDB Atlas with authentication
8. ✅ Implement backup strategies

## 📈 Performance Optimizations

### Database
- ✅ Compound indexes for common queries
- ✅ Lean queries where possible
- ✅ Population only when needed
- ✅ TTL indexes for auto-cleanup
- ✅ Connection pooling (max 10)

### API
- ✅ Pagination for list endpoints
- ✅ Field selection support
- ✅ Async/await error handling
- ✅ Response compression (via reverse proxy)
- ✅ Rate limiting per IP

## 🛠️ Development Workflow

### Running Development Server
```powershell
npm run dev  # Watches for changes with tsx
```

### Building for Production
```powershell
npm run build  # Compiles TypeScript to dist/
npm start      # Runs compiled code
```

### Type Checking
```powershell
npm run type-check  # TypeScript validation
```

### Linting
```powershell
npm run lint  # ESLint check
```

## 🔄 Next Steps & Roadmap

### Phase 1: Core Implementation ✅
- [x] Authentication & JWT
- [x] User & Batch models
- [x] RBAC middleware
- [x] Input validation
- [x] Error handling
- [x] Database seeding

### Phase 2: Inspection & Certification
- [ ] Inspection controller & routes
- [ ] Certificate issuance (W3C VC)
- [ ] QR code generation
- [ ] Verification endpoint
- [ ] Certificate revocation

### Phase 3: Advanced Features
- [ ] Notification system
- [ ] File upload (multipart/form-data)
- [ ] Admin dashboard APIs
- [ ] Audit log queries
- [ ] Batch statistics & analytics
- [ ] Email notifications

### Phase 4: Production Readiness
- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] API documentation (Swagger)
- [ ] Rate limiting per user
- [ ] Monitoring & logging
- [ ] Docker containerization
- [ ] CI/CD pipeline

## 🐛 Troubleshooting

### MongoDB Connection Issues
```powershell
# Check if MongoDB is running
Test-NetConnection -ComputerName localhost -Port 27017

# Start MongoDB service
net start MongoDB
```

### Port Already in Use
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### JWT Token Issues
- Ensure JWT secrets are set in `.env`
- Token expiry: Access tokens expire in 15 minutes
- Use refresh token to get new access token

## 📚 Additional Resources

- [MongoDB Compass](https://www.mongodb.com/try/download/compass) - GUI for MongoDB
- [Postman](https://www.postman.com/) - API testing
- [W3C VC Spec](https://www.w3.org/TR/vc-data-model/) - Verifiable Credentials
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

See main project README for contribution guidelines.

## 📝 License

MIT License

---

**Built for AgriQCert Hackathon 2024**
**Full-stack Digital Product Passport for Agricultural Quality Certification**
