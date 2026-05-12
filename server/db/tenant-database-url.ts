import { env } from "@/shared/config/env";

type BuildTenantDatabaseUrlInput = {
  databaseName: string;
};

export function buildTenantDatabaseUrl({
  databaseName,
}: BuildTenantDatabaseUrlInput) {
  const url = new URL("postgresql://placeholder");

  url.username = env.TENANT_DATABASE_USER;
  url.password = env.TENANT_DATABASE_PASSWORD;
  url.hostname = env.TENANT_DATABASE_HOST;
  url.port = String(env.TENANT_DATABASE_PORT);
  url.pathname = `/${databaseName}`;

  url.searchParams.delete("sslmode");

  if (env.TENANT_DATABASE_SSL === true) {
    url.searchParams.set("sslmode", "require");
  }

  return url.toString();
}