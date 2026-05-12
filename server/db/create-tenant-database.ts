import postgres from "postgres";

import { env } from "@/shared/config/env";

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function createTenantDatabase(databaseName: string) {
  const provisioningSql = postgres(env.DATABASE_PROVISIONING_URL, {
    max: 1,
  });

  try {
    const existing = await provisioningSql<{ datname: string }[]>`
      SELECT datname
      FROM pg_database
      WHERE datname = ${databaseName}
      LIMIT 1
    `;

    const quotedDatabaseName = quoteIdentifier(databaseName);
    const quotedOwner = quoteIdentifier(env.TENANT_DATABASE_USER);

    if (existing.length === 0) {
      await provisioningSql.unsafe(
        `CREATE DATABASE ${quotedDatabaseName} OWNER ${quotedOwner}`,
      );
    } else {
      await provisioningSql.unsafe(
        `ALTER DATABASE ${quotedDatabaseName} OWNER TO ${quotedOwner}`,
      );
    }

    const tenantProvisioningUrl = new URL(env.DATABASE_PROVISIONING_URL);
    tenantProvisioningUrl.pathname = `/${databaseName}`;

    const tenantProvisioningSql = postgres(tenantProvisioningUrl.toString(), {
      max: 1,
    });

    try {
      await tenantProvisioningSql.unsafe(
        `ALTER DATABASE ${quotedDatabaseName} OWNER TO ${quotedOwner}`,
      );

      await tenantProvisioningSql.unsafe(
        `GRANT CONNECT, CREATE ON DATABASE ${quotedDatabaseName} TO ${quotedOwner}`,
      );

      await tenantProvisioningSql.unsafe(
        `GRANT USAGE, CREATE ON SCHEMA public TO ${quotedOwner}`,
      );

    } finally {
      await tenantProvisioningSql.end();
    }

    return {
      created: existing.length === 0,
      databaseName,
    };
  } finally {
    await provisioningSql.end();
  }
}