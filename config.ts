import crypto from 'crypto';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().optional(),
  CNIC_ENCRYPTION_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('*'),
  PAYMENT_MODE: z.string().default('Simulated_Demonstration_Sandbox'),
});

const parsed = envSchema.parse(process.env);

// Security enforcement: Fail at startup in production if JWT_SECRET is missing
let jwtSecret = parsed.JWT_SECRET;
if (!jwtSecret) {
  if (parsed.NODE_ENV === 'production') {
    console.error('FATAL PRODUCTION ERROR: JWT_SECRET must be configured in environment.');
    process.exit(1);
  } else {
    // Generate an ephemeral secure random secret for this dev/test process
    jwtSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[PlateShare Security] JWT_SECRET was not provided. Generated a secure process-bound secret for development.');
  }
}

// Normalize payment mode cleanly (support 'sandbox', 'Simulated_Demonstration_Sandbox', etc.)
let paymentMode: 'Simulated_Demonstration_Sandbox' | 'Live_Gateway' = 'Simulated_Demonstration_Sandbox';
if (parsed.PAYMENT_MODE?.toLowerCase().includes('live')) {
  paymentMode = 'Live_Gateway';
}

// In development, the dev server must run on port 3000 per runtime constraints
const effectivePort = parsed.NODE_ENV === 'production' && process.env.PORT ? parsed.PORT : 3000;

export const config = {
  port: effectivePort,
  nodeEnv: parsed.NODE_ENV,
  jwtSecret: jwtSecret as string,
  cnicEncryptionKey: parsed.CNIC_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  corsOrigins: parsed.CORS_ORIGINS.split(',').map(s => s.trim()),
  paymentMode,
  isProduction: parsed.NODE_ENV === 'production',
  isTest: parsed.NODE_ENV === 'test',
};
