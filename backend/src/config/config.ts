import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];

const validateConfig = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length) {
    const error = new Error(`Missing required configuration: ${missing.join(", ")}`);
    console.error("Configuration Error:", error.message);
    if (process.env.NODE_ENV === "production") throw error;
  }
};

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  apiPrefix: process.env.API_PREFIX || "/api",

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/agriqcert",
    testUri: process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/agriqcert_test",
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  },

  // Grouping specific feature settings
  features: {
    vc: {
      issuerDid: process.env.VC_ISSUER_DID || "did:example:agriqcert",
      verificationMethod: process.env.VC_VERIFICATION_METHOD,
      defaultExpiryDays: parseInt(process.env.VC_DEFAULT_EXPIRY_DAYS || "365", 10),
    },
    inji: {
      apiUrl: process.env.INJI_API_URL,
      apiKey: process.env.INJI_API_KEY,
      issuerDid: process.env.INJI_ISSUER_DID,
      webhookSecret: process.env.INJI_WEBHOOK_SECRET,
      mockMode: process.env.INJI_MOCK_MODE === "true" || process.env.INJI_MOCK_MODE === "1",
    },
    worker: {
      pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || "3000", 10),
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || "2", 10),
    },
    geolocation: {
      maxAccuracyMeters: parseInt(process.env.MAX_LOCATION_ACCURACY_METERS || "100", 10),
    },
    qr: {
      baseUrl: process.env.QR_BASE_URL || "https://verify.agriqcert.com",
    },
  },

  admin: {
    email: process.env.ADMIN_EMAIL || "admin@agriqcert.com",
    password: process.env.ADMIN_PASSWORD || "Admin@123456",
    name: process.env.ADMIN_NAME || "System Administrator",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },

  validateConfig,
};

export default config;
