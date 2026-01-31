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
      environment: process.env.INJI_ENVIRONMENT || "sandbox",
      apiUrl: process.env.INJI_ENVIRONMENT === "production" 
        ? process.env.INJI_PRODUCTION_API_URL 
        : process.env.INJI_SANDBOX_API_URL || process.env.INJI_API_URL,
      apiKey: process.env.INJI_API_KEY,
      clientId: process.env.INJI_CLIENT_ID,
      clientSecret: process.env.INJI_CLIENT_SECRET,
      issuerDid: process.env.INJI_ISSUER_DID || process.env.VC_ISSUER_DID || "did:example:agriqcert",
      
      // Webhook configuration
      webhookEnabled: process.env.INJI_WEBHOOK_ENABLED === "true",
      webhookSecret: process.env.INJI_WEBHOOK_SECRET,
      webhookSignatureAlgorithm: process.env.INJI_WEBHOOK_SIGNATURE_ALGORITHM || "sha256",
      webhookToleranceSeconds: parseInt(process.env.INJI_WEBHOOK_TOLERANCE_SECONDS || "300", 10),
      webhookRetryMaxAttempts: parseInt(process.env.INJI_WEBHOOK_RETRY_MAX_ATTEMPTS || "3", 10),
      
      // Wallet configuration
      walletPushEnabled: process.env.INJI_WALLET_PUSH_ENABLED === "true",
      walletDeeplinkScheme: process.env.INJI_WALLET_DEEPLINK_SCHEME || "inji://",
      walletAppUrl: process.env.INJI_WALLET_APP_URL || "https://wallet.inji.io",
      
      // Mode configuration
      mockMode: process.env.INJI_MOCK_MODE === "true" || process.env.INJI_MOCK_MODE === "1",
      demoMode: process.env.INJI_DEMO_MODE === "true",
      demoRecordingPath: process.env.INJI_DEMO_RECORDING_PATH || "./docs/demo-recordings/",
      recordDemos: process.env.INJI_RECORD_DEMOS === "true",
      fallbackToDemoOnError: process.env.INJI_FALLBACK_TO_DEMO_ON_ERROR === "true",
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
