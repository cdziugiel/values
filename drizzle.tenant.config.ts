import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

function buildTenantDevDatabaseUrl() {
  const user = process.env.TENANT_DATABASE_USER;
  const password = process.env.TENANT_DATABASE_PASSWORD;
  const host = process.env.TENANT_DATABASE_HOST;
  const port = process.env.TENANT_DATABASE_PORT;

  if (!user || !password || !host || !port) {
    return undefined;
  }

  const url = new URL("postgresql://placeholder");

  url.username = user;
  url.password = password;
  url.hostname = host;
  url.port = port;
  url.pathname = "/humanet_tenant_acme";

  if (process.env.TENANT_DATABASE_SSL?.trim().toLowerCase() === "true") {
    url.searchParams.set("sslmode", "require");
  }

  return url.toString();
}

const tenantDatabaseUrl =
  process.env.TENANT_DATABASE_URL ??
  process.env.HUMANET_TENANT_DATABASE_URL ??
  buildTenantDevDatabaseUrl();

if (!tenantDatabaseUrl) {
  throw new Error("Missing tenant database connection settings.");
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