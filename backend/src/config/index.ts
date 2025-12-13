import dotenv from 'dotenv';

dotenv.config();

interface Config {
  env: string;
  port: number;
  apiPrefix: string;
  mongodb: {
    uri: string;
    testUri: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  bcrypt: {
    rounds: number;
  };
  security: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  cors: {
    origin: string;
    allowedOrigins: string[];
  };
  upload: {
    maxFileSize: number;
    uploadDir: string;
    allowedFileTypes: string[];
  };
  vc: {
    issuerDid: string;
    verificationMethod: string;
    defaultExpiryDays: number;
  };
  inji: {
    apiUrl: string;
    apiKey: string;
    issuerDid: string;
    webhookSecret: string;
    mockMode: string;
  };
  worker: {
    pollIntervalMs: number;
    concurrency: number;
  };
  admin: {
    email: string;
    password: string;
    name: string;
  };
  logging: {
    level: string;
  };
  geolocation: {
    maxAccuracyMeters: number;
  };
  qr: {
    baseUrl: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api',
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agriqcert',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/agriqcert_test',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },
  
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg,application/pdf').split(','),
  },
  
  vc: {
    issuerDid: process.env.VC_ISSUER_DID || 'did:example:agriqcert',
    verificationMethod: process.env.VC_VERIFICATION_METHOD || 'did:example:agriqcert#key-1',
    defaultExpiryDays: parseInt(process.env.VC_DEFAULT_EXPIRY_DAYS || '365', 10),
  },
  
  inji: {
    apiUrl: process.env.INJI_API_URL || 'https://api.inji.example',
    apiKey: process.env.INJI_API_KEY || '',
    issuerDid: process.env.INJI_ISSUER_DID || 'did:example:agency-123',
    webhookSecret: process.env.INJI_WEBHOOK_SECRET || '',
    mockMode: process.env.INJI_MOCK_MODE || 'true',
  },
  
  worker: {
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || '3000', 10),
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@agriqcert.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    name: process.env.ADMIN_NAME || 'System Administrator',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  geolocation: {
    maxAccuracyMeters: parseInt(process.env.MAX_LOCATION_ACCURACY_METERS || '100', 10),
  },
  
  qr: {
    baseUrl: process.env.QR_BASE_URL || 'https://verify.agriqcert.com',
  },
};

// Validate required configuration
const validateConfig = () => {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0 && config.env === 'production') {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }

  // Warn about using default secrets in production
  if (config.env === 'production') {
    if (config.jwt.secret.includes('change-in-production')) {
      console.error('ERROR: Using default JWT secret in production!');
      process.exit(1);
    }
  }
};

validateConfig();

export default config;
