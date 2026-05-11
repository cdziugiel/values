import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("HUMANET VALUES"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = envSchema.parse({
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});