# AgriQCert Backend API

Production-grade Node.js + Express + MongoDB backend for the AgriQCert Digital Product Passport system.

## 🎯 Features

- **JWT Authentication** with access & refresh tokens
- **Role-Based Access Control** (RBAC) - Farmer, QA Inspector, Certifier, Admin, Verifier
- **RESTful API** with comprehensive validation
- **MongoDB** with optimized schemas and indexes
- **W3C Verifiable Credentials** for certifications
- **Audit Logging** for compliance
- **Rate Limiting** and security best practices
- **TypeScript** for type safety
- **Comprehensive Error Handling**

## 🏗️ Architecture

```
backend/
├── src/
│   ├── config/          # Configuration and database setup
│   ├── models/          # Mongoose schemas
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, validation, error handling
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Zod validation schemas
│   ├── types/           # TypeScript type definitions
│   ├── scripts/         # Database seeds and utilities
│   └── server.ts        # Application entry point
├── uploads/             # File uploads directory
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** >= 6.0 (MongoDB Compass for GUI)
- **npm** >= 9.0.0

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd backend
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env` and configure:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your settings:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/agriqcert

# Generate secure secrets in production
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
```

### 3. Start MongoDB

Using MongoDB Compass, connect to:
```
mongodb://localhost:27017
```

Or via command line:
```powershell
mongod
```

### 4. Run Development Server

```powershell
npm run dev
```

Server will start at `http://localhost:5000`

### 5. Seed Database (Optional)

```powershell
npm run seed
```

This creates:
- Admin user: `admin@agriqcert.com` / `Admin@123456`
- Sample farmers, inspectors, certifiers
- Demo batches and inspections

## 🔐 Authentication Flow

### 1. Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "farmer@example.com",
  "password": "SecurePass123!",
  "name": "John Farmer",
  "role": "farmer",
  "organization": "Green Farms Ltd"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "email": "farmer@example.com",
      "name": "John Farmer",
      "role": "farmer"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

### 2. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "farmer@example.com",
  "password": "SecurePass123!"
}
```

### 3. Use Access Token

Include in Authorization header for protected routes:

```http
GET /api/batches
Authorization: Bearer eyJhbGc...
```

### 4. Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Batches
- `GET /api/batches` - Get all batches (paginated)
- `GET /api/batches/stats` - Get batch statistics
- `GET /api/batches/:id` - Get batch by ID
- `POST /api/batches` - Create new batch (Farmer, Admin)
- `PUT /api/batches/:id` - Update batch (Farmer, Admin)
- `POST /api/batches/:id/submit` - Submit batch for inspection
- `DELETE /api/batches/:id` - Delete batch (draft only)

### Inspections (To be added)
- `POST /api/inspections` - Create inspection (QA Inspector)
- `GET /api/inspections/:id` - Get inspection details
- `PUT /api/inspections/:id` - Update inspection

### Certificates (To be added)
- `POST /api/certificates/issue` - Issue certificate (Certifier)
- `GET /api/certificates/:id` - Get certificate
- `POST /api/certificates/:id/revoke` - Revoke certificate
- `POST /api/verify` - Verify certificate by QR

### Notifications (To be added)
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Admin (To be added)
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/audit-logs` - Get audit logs

## 🗄️ Database Schema

### User Schema
```typescript
{
  email: string;           // Unique, indexed
  password: string;        // Hashed with bcrypt
  name: string;
  role: 'farmer' | 'qa_inspector' | 'certifier' | 'admin' | 'verifier';
  organization?: string;
  phone?: string;
  isActive: boolean;       // For soft delete
  isVerified: boolean;
  lastLogin?: Date;
  refreshTokens: string[]; // JWT refresh tokens
  createdAt: Date;
  updatedAt: Date;
}
```

### Batch Schema
```typescript
{
  farmerId: string;        // Ref: User
  farmerName: string;
  productType: string;
  productName: string;
  quantity: number;
  unit: 'kg' | 'tons' | 'pieces' | 'liters' | 'bushels';
  harvestDate: Date;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    region: string;
  };
  status: 'draft' | 'submitted' | 'inspecting' | 'approved' | 'rejected' | 'certified';
  attachments: Array<{
    id: string;
    name: string;
    type: 'image' | 'document' | 'certificate';
    url: string;
    size: number;
  }>;
  submittedAt?: Date;
  certifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Inspection Schema
```typescript
{
  batchId: string;         // Ref: Batch
  inspectorId: string;     // Ref: User
  inspectorName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  readings: Array<{
    parameter: string;
    value: number | string;
    unit: string;
    minThreshold?: number;
    maxThreshold?: number;
    passed: boolean;
  }>;
  photos: string[];
  geolocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
  notes: string;
  overallResult: 'pass' | 'fail' | 'pending';
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Certificate Schema (W3C VC)
```typescript
{
  batchId: string;         // Ref: Batch, unique
  vc: {
    '@context': string[];
    type: string[];
    issuer: string;        // DID
    issuanceDate: string;
    expirationDate?: string;
    credentialSubject: {
      id: string;
      batchId: string;
      productName: string;
      certificationStandard: string;
      ...
    };
    proof?: {
      type: string;
      created: string;
      verificationMethod: string;
      jws?: string;
    };
  };
  qrCodeData: string;
  status: 'active' | 'revoked' | 'expired';
  issuedBy: string;        // Ref: User
  issuedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔒 Role-Based Permissions

| Role          | Permissions |
|---------------|-------------|
| **Farmer**    | Create/edit own batches (draft), submit for inspection, view certificates |
| **QA Inspector** | View batches, create/complete inspections |
| **Certifier** | View approved batches, issue/revoke certificates |
| **Admin**     | Full access to all resources, user management, audit logs |
| **Verifier**  | View and verify certificates (public role) |

## 🧪 Testing

```powershell
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🐛 Debugging

Enable detailed logging in `.env`:
```env
LOG_LEVEL=debug
```

View MongoDB queries:
```typescript
mongoose.set('debug', true);
```

## 📦 Production Deployment

### 1. Build

```powershell
npm run build
```

### 2. Set Production Environment

```env
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/agriqcert
```

### 3. Start

```powershell
npm start
```

### Security Checklist

- ✅ Change default JWT secrets
- ✅ Use HTTPS in production
- ✅ Set secure CORS origins
- ✅ Enable rate limiting
- ✅ Use MongoDB Atlas with authentication
- ✅ Set up monitoring and logging
- ✅ Regular security audits: `npm audit`
- ✅ Keep dependencies updated

## 🔧 MongoDB Compass Setup

1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Create database: `agriqcert`
4. Collections will be auto-created on first use

### Useful Queries

**Find all farmers:**
```javascript
db.users.find({ role: "farmer" })
```

**Find submitted batches:**
```javascript
db.batches.find({ status: "submitted" })
```

**Get batch with inspections:**
```javascript
db.batches.aggregate([
  { $match: { _id: ObjectId("...") } },
  { $lookup: {
      from: "inspections",
      localField: "_id",
      foreignField: "batchId",
      as: "inspections"
  }}
])
```

## 📖 Additional Documentation

- [API Postman Collection](./docs/postman_collection.json)
- [Database ERD](./docs/database-erd.md)
- [Authentication Guide](./docs/authentication.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🆘 Support

For issues and questions:
- GitHub Issues: [Create Issue](https://github.com/your-org/agriqcert/issues)
- Email: support@agriqcert.com

---

**Built with ❤️ for AgriQCert Hackathon**
