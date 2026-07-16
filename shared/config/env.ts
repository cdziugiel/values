import "server-only";
import { z } from "zod";

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (!value) {
      return false;
    }

    return value.trim().toLowerCase() === "true";
  });

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("HUMANET VALUES"),
  APP_URL: z.string().url().default("http://localhost:3020"),

  CONTROL_DATABASE_URL: z.string().url(),

  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  EMAIL_SERVER_HOST: z.string().min(1),
  EMAIL_SERVER_PORT: z.coerce.number().int().positive(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().min(1),
  SUPPORT_EMAIL: z.string().email(),

  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_PROVISIONING_URL: z.string().url(),
  TENANT_DATABASE_HOST: z.string().min(1),
  TENANT_DATABASE_PORT: z.coerce.number().int().positive(),
  TENANT_DATABASE_USER: z.string().min(1),
  TENANT_DATABASE_PASSWORD: z.string().min(1),
  TENANT_DATABASE_SSL: booleanFromEnv,
  DATABASE_ENCRYPTION_KEY: z.string().min(32),

  P24_BASE_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/, "")),

  P24_MERCHANT_ID: z.coerce.number().int().positive(),
  P24_POS_ID: z.coerce.number().int().positive(),

  P24_API_KEY: z.string().min(1),
  P24_CRC: z.string().min(1),
});

export const env = envSchema.parse({
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL,

  CONTROL_DATABASE_URL: process.env.CONTROL_DATABASE_URL,

  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,

  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,

  AUTH_MICROSOFT_ENTRA_ID_ID: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
  AUTH_MICROSOFT_ENTRA_ID_SECRET: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  AUTH_MICROSOFT_ENTRA_ID_TENANT_ID:
    process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,

  NODE_ENV: process.env.NODE_ENV,

  DATABASE_PROVISIONING_URL: process.env.DATABASE_PROVISIONING_URL,
  TENANT_DATABASE_HOST: process.env.TENANT_DATABASE_HOST,
  TENANT_DATABASE_PORT: process.env.TENANT_DATABASE_PORT,
  TENANT_DATABASE_USER: process.env.TENANT_DATABASE_USER,
  TENANT_DATABASE_PASSWORD: process.env.TENANT_DATABASE_PASSWORD,
  TENANT_DATABASE_SSL: process.env.TENANT_DATABASE_SSL,
  DATABASE_ENCRYPTION_KEY: process.env.DATABASE_ENCRYPTION_KEY,

  P24_BASE_URL: process.env.P24_BASE_URL,
  P24_MERCHANT_ID: process.env.P24_MERCHANT_ID,
  P24_POS_ID: process.env.P24_POS_ID,
  P24_API_KEY: process.env.P24_API_KEY,
  P24_CRC: process.env.P24_CRC,
});