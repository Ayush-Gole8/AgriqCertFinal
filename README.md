# 🌾 AgriQCert - Digital Product Passport for Agricultural Quality Certification

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)

A comprehensive digital certification platform that leverages **W3C Verifiable Credentials** and **Inji integration** to ensure agricultural product authenticity and quality throughout the supply chain.

## 🎯 Vision & Mission

**Vision**: To create a transparent, trustworthy, and efficient agricultural quality certification ecosystem using blockchain-inspired digital credentials.

**Mission**: Empower farmers, inspectors, certifiers, and consumers with verifiable digital certificates that prove agricultural product quality, origin, and compliance with international standards.

## ✨ Key Features

### 🔐 **W3C Verifiable Credentials**
- Issue tamper-proof digital certificates
- Industry-standard compliance
- QR code generation for easy verification
- Credential revocation management

### 🛡️ **Inji Integration**
- **Inji Certify**: Automated credential issuance
- **Inji Verify**: Real-time credential verification
- **Inji Wallet**: Secure credential storage (coming soon)
- Mock/Production mode switching

### 👥 **Role-Based Access Control**
- **Farmers**: Submit products for certification
- **QA Inspectors**: Conduct quality inspections
- **Certifiers**: Issue digital certificates
- **Administrators**: Platform management
- **Verifiers**: Public verification access

### 📱 **Modern Technology Stack**
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Authentication**: JWT with refresh tokens
- **File Handling**: Secure uploads with validation
- **Real-time**: WebSocket support for live updates

### 🔄 **Complete Certification Workflow**
1. Farmers submit product batches
2. QA Inspectors conduct field inspections
3. Certifiers review and issue credentials
4. Digital certificates with QR codes generated
5. Public verification through QR scanning
6. Full audit trail and compliance tracking

## 🏗️ Project Architecture

```
AgriQCert/
├── 📁 frontend/                 # React TypeScript Frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/              # Route pages
│   │   ├── hooks/              # Custom React hooks
│   │   ├── contexts/           # React contexts
│   │   ├── api/                # API client and services
│   │   └── types/              # TypeScript definitions
│   ├── public/                 # Static assets
│   └── package.json            # Frontend dependencies
│
├── 📁 backend/                  # Node.js Express Backend
│   ├── src/
│   │   ├── controllers/        # Route handlers
│   │   ├── models/             # MongoDB schemas
│   │   ├── routes/             # API endpoints
│   │   ├── middleware/         # Auth & validation
│   │   ├── services/           # Business logic
│   │   │   ├── injiClient.ts   # Inji API integration
│   │   │   └── verifyService.ts # VC verification
│   │   ├── workers/            # Background workers
│   │   ├── validators/         # Zod schemas
│   │   └── utils/              # Helper functions
│   ├── uploads/                # File storage
│   └── package.json            # Backend dependencies
│
└── 📄 Documentation
    ├── INJI_INTEGRATION.md      # Inji integration guide
    └── Various testing scripts
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** >= 6.0
- **npm** >= 9.0.0
- **Git**

### 1. Clone Repository

```bash
git clone https://github.com/your-org/agriqcert.git
cd agriqcert
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets

# Start MongoDB (if running locally)
mongod

# Seed database with sample data
npm run seed

# Start development server
npm run dev
```

Backend will be running at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be running at `http://localhost:5173`

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Sample Login**: 
  - Email: `admin@agriqcert.com`
  - Password: `Admin@123456`

## 📊 User Workflows

### For Farmers 🧑‍🌾
1. Register and verify account
2. Create product batches with details
3. Upload supporting documents/photos
4. Submit for quality inspection
5. Receive certification notifications
6. Download/share digital certificates

### For QA Inspectors 🔍
1. Receive batch inspection assignments
2. Conduct on-site quality checks
3. Record test results and readings
4. Upload inspection photos
5. Submit pass/fail recommendations
6. Track inspection history

### For Certifiers 📋
1. Review approved inspection reports
2. Verify compliance with standards
3. Issue W3C Verifiable Credentials
4. Generate QR codes for certificates
5. Manage certificate lifecycle
6. Handle revocation requests

### For Consumers/Verifiers 📱
1. Scan QR codes on products
2. Instantly verify certificate authenticity
3. View product details and certifications
4. Check certificate status and validity
5. Access full supply chain information

## 🔧 Environment Configuration

### Backend (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/agriqcert

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars

# Inji Configuration (Optional - uses mock by default)
INJI_BASE_URL=https://api.inji.io
INJI_API_KEY=your-inji-api-key
INJI_MOCK_MODE=true

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_ENVIRONMENT=development
```

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm test -- injiClient.test.ts
```

### Integration Testing

```bash
# Test complete integration workflow
npm run test-final-integration

# Test frontend components
npm run test-frontend

# Test VC verification
npm run test-verification

# Test revocation flow
npm run test-revocation
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Batch Management
- `GET /api/batches` - List all batches
- `POST /api/batches` - Create new batch
- `GET /api/batches/:id` - Get batch details
- `PUT /api/batches/:id` - Update batch
- `POST /api/batches/:id/submit` - Submit for inspection

### Certificate Operations
- `POST /api/vc/issue` - Issue verifiable credential
- `POST /api/vc/verify` - Verify credential
- `GET /api/vc/:id` - Get certificate details
- `POST /api/vc/:id/revoke` - Revoke certificate

### Inspection Workflow
- `POST /api/inspections` - Create inspection
- `GET /api/inspections/:id` - Get inspection details
- `PUT /api/inspections/:id` - Update inspection results

For detailed API documentation with examples, see [backend/README.md](./backend/README.md).

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - High-quality components
- **React Hook Form** - Form management
- **Zustand/Context** - State management
- **React Query** - Server state management

### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Zod** - Schema validation
- **bcrypt** - Password hashing
- **Multer** - File uploads

### DevOps & Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **MongoDB Compass** - Database GUI
- **Postman** - API testing

## 🔐 Security Features

- **JWT Authentication** with refresh token rotation
- **Role-Based Access Control** (RBAC)
- **Password Hashing** with bcrypt
- **Input Validation** with Zod schemas
- **Rate Limiting** on API endpoints
- **File Upload Security** with type validation
- **CORS Configuration** for cross-origin protection
- **Audit Logging** for compliance tracking

## 🚀 Production Deployment

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t agriqcert-backend ./backend
docker build -t agriqcert-frontend ./frontend
```

### Manual Deployment

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ folder with nginx or CDN
```

### Environment Checklist

- [ ] Change default JWT secrets
- [ ] Configure production MongoDB URI
- [ ] Set up HTTPS certificates
- [ ] Configure domain and CORS
- [ ] Set up monitoring and logging
- [ ] Enable backup strategy
- [ ] Configure error reporting

## 📊 Monitoring & Analytics

### Available Metrics
- User registration and activity
- Batch submission rates
- Inspection completion times
- Certificate issuance statistics
- Verification request analytics
- API performance metrics

### Health Checks
- `GET /api/health` - Service health status
- Database connectivity monitoring
- Inji service availability
- File system health

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md).

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commits
- Ensure ESLint passes

## 📋 Roadmap

### Phase 1 (Current) ✅
- [x] Basic certification workflow
- [x] W3C VC integration
- [x] Inji Certify/Verify integration
- [x] QR code generation and scanning
- [x] Role-based access control

### Phase 2 (In Progress) 🚧
- [ ] Mobile application
- [ ] Blockchain anchoring
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] API rate limiting improvements

### Phase 3 (Planned) 📅
- [ ] IoT device integration
- [ ] AI-powered quality assessment
- [ ] International standards compliance
- [ ] Marketplace integration
- [ ] Carbon footprint tracking

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support & Community

### Documentation
- [API Documentation](./backend/README.md)
- [Frontend Guide](./frontend/README.md)
- [Inji Integration](./INJI_INTEGRATION.md)

### Support Channels
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-org/agriqcert/issues)
- **Email**: support@agriqcert.com
- **Documentation**: [Visit our docs](https://docs.agriqcert.com)

### Community
- **Discord**: [Join our community](https://discord.gg/agriqcert)
- **Twitter**: [@AgriQCert](https://twitter.com/agriqcert)

## 🏆 Acknowledgments

- **Inji Team** - For W3C VC infrastructure
- **MongoDB** - For database solutions
- **React Team** - For the amazing frontend framework
- **Node.js Community** - For the robust backend ecosystem
- **Open Source Contributors** - For making this project possible

---

**Built with ❤️ for sustainable agriculture and supply chain transparency**

*AgriQCert is committed to revolutionizing agricultural quality certification through cutting-edge technology and verifiable digital credentials.*