import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

if (!process.env.CONTROL_DATABASE_URL) {
  throw new Error("Missing CONTROL_DATABASE_URL in .env.local");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle/migrations/control",
  dbCredentials: {
    url: process.env.CONTROL_DATABASE_URL,
  },
  verbose: true,
  strict: true,
});