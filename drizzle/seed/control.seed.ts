import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../schema";

const {
  systemAuditLog,
  systemSettings,
  tenantDatabaseConnections,
  tenantMemberships,
  tenants,
  users,
} = schema;

config({ path: ".env.local" });

const databaseUrl = process.env.CONTROL_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing CONTROL_DATABASE_URL in .env.local");
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql, { schema });

const SUPER_ADMIN_EMAIL =
  process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@humanet.local";

async function main() {
  console.log("Seeding control database...");

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, SUPER_ADMIN_EMAIL),
  });

  const [admin] = existingAdmin
    ? [existingAdmin]
    : await db
        .insert(users)
        .values({
          email: SUPER_ADMIN_EMAIL,
          name: "HUMANET Super Admin",
          globalRole: "SUPER_ADMIN",
          status: "active",
        })
        .returning();

  console.log(`Super admin: ${admin.email}`);

  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "humanet"),
  });

  const [humanetTenant] = existingTenant
    ? [existingTenant]
    : await db
        .insert(tenants)
        .values({
          slug: "humanet",
          name: "HUMANET",
          status: "active",
          createdBy: admin.id,
          updatedBy: admin.id,
        })
        .returning();

  console.log(`Tenant: ${humanetTenant.slug}`);

  const existingMembership = await db.query.tenantMemberships.findFirst({
    where: eq(tenantMemberships.userId, admin.id),
  });

  if (!existingMembership) {
    await db.insert(tenantMemberships).values({
      userId: admin.id,
      tenantId: humanetTenant.id,
      role: "TENANT_OWNER",
      status: "active",
      createdBy: admin.id,
      updatedBy: admin.id,
    });

    console.log("Tenant membership created.");
  } else {
    console.log("Tenant membership already exists.");
  }

  const existingConnection =
    await db.query.tenantDatabaseConnections.findFirst({
      where: eq(tenantDatabaseConnections.tenantId, humanetTenant.id),
    });

  if (!existingConnection) {
    await db.insert(tenantDatabaseConnections).values({
      tenantId: humanetTenant.id,
      databaseName: "humanet_tenant_humanet",
      databaseUrlEncrypted:
        "local-dev-placeholder-encrypted-tenant-database-url",
      schemaVersion: 0,
      migrationStatus: "pending",
      createdBy: admin.id,
      updatedBy: admin.id,
    });

    console.log("Tenant database connection placeholder created.");
  } else {
    console.log("Tenant database connection already exists.");
  }

  const defaultAssessmentSettingKey = "default_assessment";

  const existingDefaultAssessment = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, defaultAssessmentSettingKey),
  });

  if (!existingDefaultAssessment) {
    await db.insert(systemSettings).values({
      key: defaultAssessmentSettingKey,
      description:
        "Default assessment shown to regular users without tenant membership.",
      value: {
        defaultAssessmentId: "humanet-values-default",
        enabledQuestionnaireCodes: ["VALUES", "CHANGE", "SAV"],
      },
      createdBy: admin.id,
      updatedBy: admin.id,
    });

    console.log("Default assessment setting created.");
  } else {
    console.log("Default assessment setting already exists.");
  }

  await db.insert(systemAuditLog).values({
    actorUserId: admin.id,
    tenantId: humanetTenant.id,
    actorRole: "SUPER_ADMIN",
    action: "control_database_seeded",
    entityType: "system",
    entityId: "control-db",
    after: {
      seeded: true,
      tenantSlug: humanetTenant.slug,
      superAdminEmail: admin.email,
    },
  });

  console.log("Control database seed completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });