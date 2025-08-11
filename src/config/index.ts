import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string(),
  DATABASE_POOL_MIN: z.string().transform(Number).default('2'),
  DATABASE_POOL_MAX: z.string().transform(Number).default('10'),
  DATABASE_TIMEOUT: z.string().transform(Number).default('30000'),

  // Redis
  REDIS_URL: z.string(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  REDIS_TIMEOUT: z.string().transform(Number).default('5000'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // MFA
  MFA_SERVICE_NAME: z.string().default('Dessai Platform'),
  MFA_ISSUER: z.string().default('Dessai'),

  // Session
  SESSION_SECRET: z.string().min(32),
  SESSION_TIMEOUT: z.string().transform(Number).default('3600000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_PATH: z.string().default('./uploads'),

  // Email
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@dessai.com'),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Push Notifications
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),

  // External Integrations
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ORGANIZATION: z.string().optional(),

  // Monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_METRICS: z.string().transform(Boolean).default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  TRUST_PROXY: z.string().transform(Boolean).default('false'),

  // Development
  ENABLE_API_DOCS: z.string().transform(Boolean).default('true'),
  ENABLE_SWAGGER: z.string().transform(Boolean).default('true'),
  API_DOCS_PATH: z.string().default('/api/docs'),
});

// Validate and export configuration
const env = envSchema.parse(process.env);

export const config = {
  // Server
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  // Database
  database: {
    url: env.DATABASE_URL,
    pool: {
      min: env.DATABASE_POOL_MIN,
      max: env.DATABASE_POOL_MAX,
    },
    timeout: env.DATABASE_TIMEOUT,
  },

  // Redis
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    timeout: env.REDIS_TIMEOUT,
  },

  // Authentication
  auth: {
    jwt: {
      secret: env.JWT_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    mfa: {
      serviceName: env.MFA_SERVICE_NAME,
      issuer: env.MFA_ISSUER,
    },
    session: {
      secret: env.SESSION_SECRET,
      timeout: env.SESSION_TIMEOUT,
    },
    bcrypt: {
      rounds: env.BCRYPT_ROUNDS,
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  // File Upload
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    path: env.UPLOAD_PATH,
  },

  // Email
  email: {
    apiKey: env.SENDGRID_API_KEY,
    from: env.EMAIL_FROM,
  },

  // SMS
  sms: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER,
  },

  // Push Notifications
  push: {
    projectId: env.FIREBASE_PROJECT_ID,
    privateKey: env.FIREBASE_PRIVATE_KEY,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
  },

  // External Integrations
  integrations: {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      organization: env.OPENAI_ORGANIZATION,
    },
  },

  // Monitoring
  monitoring: {
    logLevel: env.LOG_LEVEL,
    enableMetrics: env.ENABLE_METRICS,
    metricsPort: env.METRICS_PORT,
  },

  // Security
  security: {
    corsOrigin: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY,
  },

  // Development
  development: {
    enableApiDocs: env.ENABLE_API_DOCS,
    enableSwagger: env.ENABLE_SWAGGER,
    apiDocsPath: env.API_DOCS_PATH,
  },
} as const;

export type Config = typeof config;
