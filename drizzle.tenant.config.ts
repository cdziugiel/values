import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const tenantDatabaseUrl =
  process.env.TENANT_DATABASE_URL ??
  process.env.HUMANET_TENANT_DATABASE_URL;

if (!tenantDatabaseUrl) {
  throw new Error(
    "Missing TENANT_DATABASE_URL or HUMANET_TENANT_DATABASE_URL in .env.local",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema/tenant-schema.ts",
  out: "./drizzle/migrations/tenant",
  dbCredentials: {
    url: tenantDatabaseUrl,
  },
  verbose: true,
  strict: true,
});