import crypto from "node:crypto";

import dotenv from "dotenv";
import postgres, { type Sql } from "postgres";

const DEFAULT_USER_EMAIL = "cezary@humanet.me";
const DEFAULT_TENANT_SLUG = "humanet";

const CONFIRMATION_ENV = "RESET_HUMANET_TO_BASELINE";
const CONFIRMATION_VALUE = "YES_I_UNDERSTAND";

const MIGRATION_TABLES = new Set([
  "__drizzle_migrations",
  "drizzle_migrations",
]);

type Mode = "preview" | "execute";

type TenantConnection = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  databaseName: string;
  databaseUrlEncrypted: string;
  schemaVersion: number;
};

type CountRow = {
  label: string;
  count: number;
};

type ValidationIssue = {
  code: string;
  message: string;
};

function loadEnvironment() {
  dotenv.config({ path: ".env.local" });
  dotenv.config();
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Brakuje wymaganej zmiennej środowiskowej: ${name}`);
  }

  return value;
}

function parseMode(): Mode {
  const preview = process.argv.includes("--preview");
  const execute = process.argv.includes("--execute");

  if (preview && execute) {
    throw new Error("Użyj tylko jednej flagi: --preview albo --execute.");
  }

  if (!preview && !execute) {
    return "preview";
  }

  return execute ? "execute" : "preview";
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function assertSafeDatabaseName(databaseName: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error(
      `Niebezpieczna nazwa bazy w tenant_database_connections: ${databaseName}`,
    );
  }
}

function decryptSecret(encryptedValue: string, encryptionKey: string) {
  const payload = Buffer.from(encryptedValue, "base64");

  if (payload.length < 29) {
    throw new Error("Nieprawidłowy zaszyfrowany connection string.");
  }

  const key = crypto.createHash("sha256").update(encryptionKey).digest();
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

async function scalarCount(sql: Sql, query: string) {
  const [row] = await sql.unsafe<{ count: number }[]>(query);
  return row?.count ?? 0;
}

async function listPublicTables(sql: Sql) {
  const rows = await sql<{ tableName: string }[]>`
    select table_name as "tableName"
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;

  return rows.map((row) => row.tableName);
}

async function truncatePublicTables(
  sql: Sql,
  additionalExcludedTables: readonly string[] = [],
) {
  const excluded = new Set([
    ...MIGRATION_TABLES,
    ...additionalExcludedTables,
  ]);

  const tables = (await listPublicTables(sql)).filter(
    (table) => !excluded.has(table),
  );

  if (tables.length === 0) {
    return;
  }

  const identifiers = tables
    .map((table) => `public.${quoteIdentifier(table)}`)
    .join(", ");

  await sql.unsafe(`truncate table ${identifiers} restart identity cascade`);
}

async function getTenantConnections(controlSql: Sql) {
  return controlSql<TenantConnection[]>`
    select
      t.id::text as "tenantId",
      t.slug as "tenantSlug",
      t.name as "tenantName",
      c.database_name as "databaseName",
      c.database_url_encrypted as "databaseUrlEncrypted",
      c.schema_version as "schemaVersion"
    from tenant_database_connections c
    inner join tenants t on t.id = c.tenant_id
    where c.deleted_at is null
      and t.deleted_at is null
    order by t.slug
  `;
}

async function validateBaseline(controlSql: Sql) {
  const issues: ValidationIssue[] = [];

  const defaultUsers = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from users
      where lower(email) = lower('${DEFAULT_USER_EMAIL.replaceAll("'", "''")}')
    `,
  );

  if (defaultUsers !== 1) {
    issues.push({
      code: "DEFAULT_USER_COUNT",
      message:
        `Oczekiwano dokładnie jednego użytkownika ${DEFAULT_USER_EMAIL}, znaleziono: ${defaultUsers}.`,
    });
  }

  const defaultTenants = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from tenants
      where slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
    `,
  );

  if (defaultTenants !== 1) {
    issues.push({
      code: "DEFAULT_TENANT_COUNT",
      message:
        `Oczekiwano dokładnie jednego tenanta ${DEFAULT_TENANT_SLUG}, znaleziono: ${defaultTenants}.`,
    });
  }

  const defaultConnections = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from tenant_database_connections c
      inner join tenants t on t.id = c.tenant_id
      where t.slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
        and t.deleted_at is null
        and c.deleted_at is null
    `,
  );

  if (defaultConnections !== 1) {
    issues.push({
      code: "DEFAULT_TENANT_CONNECTION",
      message:
        `Tenant ${DEFAULT_TENANT_SLUG} musi mieć dokładnie jedno aktywne połączenie bazodanowe.`,
    });
  }

  const activeQuestionnaireVersionsWithoutPages = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from questionnaire_versions qv
      where qv.status = 'active'
        and qv.deleted_at is null
        and not exists (
          select 1
          from questionnaire_pages qp
          where qp.questionnaire_version_id = qv.id
            and qp.deleted_at is null
        )
    `,
  );

  if (activeQuestionnaireVersionsWithoutPages > 0) {
    issues.push({
      code: "QUESTIONNAIRE_WITHOUT_PAGES",
      message:
        `${activeQuestionnaireVersionsWithoutPages} aktywnych wersji kwestionariuszy nie ma aktywnych stron.`,
    });
  }

  const activeQuestionnaireVersionsWithoutItems = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from questionnaire_versions qv
      where qv.status = 'active'
        and qv.deleted_at is null
        and not exists (
          select 1
          from questionnaire_items qi
          where qi.questionnaire_version_id = qv.id
            and qi.deleted_at is null
        )
    `,
  );

  if (activeQuestionnaireVersionsWithoutItems > 0) {
    issues.push({
      code: "QUESTIONNAIRE_WITHOUT_ITEMS",
      message:
        `${activeQuestionnaireVersionsWithoutItems} aktywnych wersji kwestionariuszy nie ma aktywnych itemów.`,
    });
  }

  const activeReportsWithoutPages = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from report_template_versions rtv
      where rtv.status = 'active'
        and rtv.deleted_at is null
        and not exists (
          select 1
          from report_template_pages rtp
          where rtp.report_template_version_id = rtv.id
            and rtp.deleted_at is null
        )
    `,
  );

  if (activeReportsWithoutPages > 0) {
    issues.push({
      code: "REPORT_WITHOUT_PAGES",
      message:
        `${activeReportsWithoutPages} aktywnych wersji raportów nie ma aktywnych stron.`,
    });
  }

  const activeReportsPointingToInactiveQuestionnaires = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from report_template_versions rtv
      inner join questionnaire_versions qv
        on qv.id = rtv.questionnaire_version_id
      where rtv.status = 'active'
        and rtv.deleted_at is null
        and (
          qv.status <> 'active'
          or qv.deleted_at is not null
        )
    `,
  );

  if (activeReportsPointingToInactiveQuestionnaires > 0) {
    issues.push({
      code: "REPORT_POINTS_TO_INACTIVE_QUESTIONNAIRE",
      message:
        `${activeReportsPointingToInactiveQuestionnaires} aktywnych wersji raportów wskazuje nieaktywną wersję kwestionariusza.`,
    });
  }

  const activeBindingsOutsideBaseline = await scalarCount(
    controlSql,
    `
      select count(*)::int as count
      from questionnaire_report_template_bindings b
      inner join questionnaire_versions qv
        on qv.id = b.questionnaire_version_id
      inner join report_template_versions rtv
        on rtv.id = b.report_template_version_id
      where b.status = 'active'
        and b.deleted_at is null
        and (
          qv.status <> 'active'
          or qv.deleted_at is not null
          or rtv.status <> 'active'
          or rtv.deleted_at is not null
        )
    `,
  );

  if (activeBindingsOutsideBaseline > 0) {
    issues.push({
      code: "INVALID_ACTIVE_BINDING",
      message:
        `${activeBindingsOutsideBaseline} aktywnych bindingów wskazuje nieaktywny kwestionariusz lub raport.`,
    });
  }

  return issues;
}

async function getPreviewCounts(controlSql: Sql) {
  const queries: Array<[string, string]> = [
    [
      "Użytkownicy — zostanie",
      `
        select count(*)::int as count
        from users
        where lower(email) = lower('${DEFAULT_USER_EMAIL.replaceAll("'", "''")}')
      `,
    ],
    [
      "Użytkownicy — usunięcie",
      `
        select count(*)::int as count
        from users
        where lower(email) <> lower('${DEFAULT_USER_EMAIL.replaceAll("'", "''")}')
      `,
    ],
    [
      "Tenanty — zostanie",
      `
        select count(*)::int as count
        from tenants
        where slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
      `,
    ],
    [
      "Tenanty — usunięcie",
      `
        select count(*)::int as count
        from tenants
        where slug <> '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
      `,
    ],
    [
      "Aktywne wersje kwestionariuszy",
      `
        select count(*)::int as count
        from questionnaire_versions
        where status = 'active'
          and deleted_at is null
      `,
    ],
    [
      "Aktywne strony kwestionariuszy",
      `
        select count(*)::int as count
        from questionnaire_pages qp
        inner join questionnaire_versions qv
          on qv.id = qp.questionnaire_version_id
        where qv.status = 'active'
          and qv.deleted_at is null
          and qp.deleted_at is null
      `,
    ],
    [
      "Aktywne wymiary kwestionariuszy",
      `
        select count(*)::int as count
        from questionnaire_dimensions qd
        inner join questionnaire_versions qv
          on qv.id = qd.questionnaire_version_id
        where qv.status = 'active'
          and qv.deleted_at is null
          and qd.deleted_at is null
      `,
    ],
    [
      "Aktywne itemy kwestionariuszy",
      `
        select count(*)::int as count
        from questionnaire_items qi
        inner join questionnaire_versions qv
          on qv.id = qi.questionnaire_version_id
        where qv.status = 'active'
          and qv.deleted_at is null
          and qi.deleted_at is null
      `,
    ],
    [
      "Aktywne wersje raportów",
      `
        select count(*)::int as count
        from report_template_versions
        where status = 'active'
          and deleted_at is null
      `,
    ],
    [
      "Aktywne strony raportów",
      `
        select count(*)::int as count
        from report_template_pages rtp
        inner join report_template_versions rtv
          on rtv.id = rtp.report_template_version_id
        where rtv.status = 'active'
          and rtv.deleted_at is null
          and rtp.deleted_at is null
      `,
    ],
    [
      "Produkty ogólne",
      `
        select count(*)::int as count
        from products
        where deleted_at is null
      `,
    ],
    [
      "Produkty dostępów raportowych",
      `
        select count(*)::int as count
        from report_access_products rap
        where rap.deleted_at is null
          and exists (
            select 1
            from report_template_versions rtv
            where rtv.report_template_id = rap.report_template_id
              and rtv.status = 'active'
              and rtv.deleted_at is null
          )
      `,
    ],
  ];

  const rows: CountRow[] = [];

  for (const [label, query] of queries) {
    rows.push({
      label,
      count: await scalarCount(controlSql, query),
    });
  }

  return rows;
}

function printCounts(title: string, rows: CountRow[]) {
  console.log(`\n${title}`);

  for (const row of rows) {
    console.log(`${row.label.padEnd(48)} ${String(row.count).padStart(8)}`);
  }
}

async function countTenantRows(tenantSql: Sql) {
  const tables = (await listPublicTables(tenantSql)).filter(
    (table) => !MIGRATION_TABLES.has(table),
  );

  const counts: CountRow[] = [];

  for (const table of tables) {
    counts.push({
      label: table,
      count: await scalarCount(
        tenantSql,
        `select count(*)::int as count from public.${quoteIdentifier(table)}`,
      ),
    });
  }

  return counts;
}

async function createBaselineTemporaryCopies(tx: Sql) {
  await tx.unsafe(`
    create temp table keep_users on commit drop as
    select *
    from users
    where lower(email) = lower('${DEFAULT_USER_EMAIL.replaceAll("'", "''")}')
  `);

  await tx.unsafe(`
    create temp table keep_tenants on commit drop as
    select *
    from tenants
    where slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
  `);

  await tx.unsafe(`
    create temp table keep_tenant_connections on commit drop as
    select c.*
    from tenant_database_connections c
    inner join keep_tenants t on t.id = c.tenant_id
    where c.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_tenant_memberships on commit drop as
    select m.*
    from tenant_memberships m
    inner join keep_users u on u.id = m.user_id
    inner join keep_tenants t on t.id = m.tenant_id
    order by m.created_at asc
    limit 1
  `);

  await tx.unsafe(`
    create temp table keep_questionnaire_versions on commit drop as
    select *
    from questionnaire_versions
    where status = 'active'
      and deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_questionnaires on commit drop as
    select q.*
    from questionnaires q
    where exists (
      select 1
      from keep_questionnaire_versions qv
      where qv.questionnaire_id = q.id
    )
  `);

  await tx.unsafe(`
    create temp table keep_questionnaire_pages on commit drop as
    select qp.*
    from questionnaire_pages qp
    inner join keep_questionnaire_versions qv
      on qv.id = qp.questionnaire_version_id
    where qp.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_questionnaire_dimensions on commit drop as
    select qd.*
    from questionnaire_dimensions qd
    inner join keep_questionnaire_versions qv
      on qv.id = qd.questionnaire_version_id
    where qd.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_questionnaire_items on commit drop as
    select qi.*
    from questionnaire_items qi
    inner join keep_questionnaire_versions qv
      on qv.id = qi.questionnaire_version_id
    where qi.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_questionnaire_item_dimension_scores on commit drop as
    select s.*
    from questionnaire_item_dimension_scores s
    inner join keep_questionnaire_items qi
      on qi.id = s.questionnaire_item_id
    inner join keep_questionnaire_dimensions qd
      on qd.id = s.questionnaire_dimension_id
    where s.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_questionnaire_page_dimension_scores on commit drop as
    select s.*
    from questionnaire_page_dimension_scores s
    inner join keep_questionnaire_pages qp
      on qp.id = s.questionnaire_page_id
    inner join keep_questionnaire_dimensions qd
      on qd.id = s.questionnaire_dimension_id
    where s.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_report_template_versions on commit drop as
    select *
    from report_template_versions
    where status = 'active'
      and deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_report_templates on commit drop as
    select rt.*
    from report_templates rt
    where exists (
      select 1
      from keep_report_template_versions rtv
      where rtv.report_template_id = rt.id
    )
  `);

  await tx.unsafe(`
    create temp table keep_report_template_pages on commit drop as
    select rtp.*
    from report_template_pages rtp
    inner join keep_report_template_versions rtv
      on rtv.id = rtp.report_template_version_id
    where rtp.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_questionnaire_report_template_bindings on commit drop as
    select b.*
    from questionnaire_report_template_bindings b
    inner join keep_questionnaire_versions qv
      on qv.id = b.questionnaire_version_id
    inner join keep_report_template_versions rtv
      on rtv.id = b.report_template_version_id
    where b.status = 'active'
      and b.deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_products on commit drop as
    select *
    from products
    where deleted_at is null
  `);

  await tx.unsafe(`
    create temp table keep_report_access_products on commit drop as
    select rap.*
    from report_access_products rap
    inner join keep_report_templates rt
      on rt.id = rap.report_template_id
    where rap.deleted_at is null
  `);
}

async function restoreBaseline(tx: Sql) {
  await tx.unsafe(`insert into users select * from keep_users`);
  await tx.unsafe(`
    update users
    set
      global_role = 'SUPER_ADMIN',
      status = 'active',
      deleted_at = null,
      updated_at = now()
    where lower(email) = lower('${DEFAULT_USER_EMAIL.replaceAll("'", "''")}')
  `);

  await tx.unsafe(`insert into tenants select * from keep_tenants`);
  await tx.unsafe(`
    update tenants
    set
      status = 'active',
      deleted_at = null,
      updated_at = now()
    where slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
  `);

  await tx.unsafe(
    `insert into tenant_database_connections select * from keep_tenant_connections`,
  );

  const membershipCount = await scalarCount(
    tx,
    `select count(*)::int as count from keep_tenant_memberships`,
  );

  if (membershipCount > 0) {
    await tx.unsafe(
      `insert into tenant_memberships select * from keep_tenant_memberships`,
    );

    await tx.unsafe(`
      update tenant_memberships
      set
        role = 'TENANT_OWNER',
        status = 'active',
        deleted_at = null,
        updated_at = now()
    `);
  } else {
    await tx.unsafe(`
      insert into tenant_memberships (
        id,
        user_id,
        tenant_id,
        role,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by,
        deleted_at
      )
      select
        gen_random_uuid(),
        u.id,
        t.id,
        'TENANT_OWNER',
        'active',
        now(),
        now(),
        u.id,
        u.id,
        null
      from users u
      cross join tenants t
      where lower(u.email) = lower('${DEFAULT_USER_EMAIL.replaceAll("'", "''")}')
        and t.slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
    `);
  }

  await tx.unsafe(`insert into questionnaires select * from keep_questionnaires`);
  await tx.unsafe(
    `insert into questionnaire_versions select * from keep_questionnaire_versions`,
  );
  await tx.unsafe(
    `insert into questionnaire_pages select * from keep_questionnaire_pages`,
  );
  await tx.unsafe(
    `insert into questionnaire_dimensions select * from keep_questionnaire_dimensions`,
  );
  await tx.unsafe(
    `insert into questionnaire_items select * from keep_questionnaire_items`,
  );
  await tx.unsafe(
    `insert into questionnaire_item_dimension_scores select * from keep_questionnaire_item_dimension_scores`,
  );
  await tx.unsafe(
    `insert into questionnaire_page_dimension_scores select * from keep_questionnaire_page_dimension_scores`,
  );

  await tx.unsafe(
    `insert into report_templates select * from keep_report_templates`,
  );
  await tx.unsafe(
    `insert into report_template_versions select * from keep_report_template_versions`,
  );
  await tx.unsafe(
    `insert into report_template_pages select * from keep_report_template_pages`,
  );
  await tx.unsafe(
    `insert into questionnaire_report_template_bindings select * from keep_questionnaire_report_template_bindings`,
  );

  await tx.unsafe(`insert into products select * from keep_products`);
  await tx.unsafe(
    `insert into report_access_products select * from keep_report_access_products`,
  );
}

async function resetControlDatabase(controlSql: Sql) {
  await controlSql.begin(async (tx) => {
    await createBaselineTemporaryCopies(tx);

    await truncatePublicTables(tx, [
      "keep_users",
      "keep_tenants",
      "keep_tenant_connections",
      "keep_tenant_memberships",
      "keep_questionnaire_versions",
      "keep_questionnaires",
      "keep_questionnaire_pages",
      "keep_questionnaire_dimensions",
      "keep_questionnaire_items",
      "keep_questionnaire_item_dimension_scores",
      "keep_questionnaire_page_dimension_scores",
      "keep_report_template_versions",
      "keep_report_templates",
      "keep_report_template_pages",
      "keep_questionnaire_report_template_bindings",
      "keep_products",
      "keep_report_access_products",
    ]);

    await restoreBaseline(tx);
  });
}

async function resetTenantDatabase(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      await truncatePublicTables(tx);
    });
  } finally {
    await sql.end();
  }
}

async function dropDatabase(
  provisioningSql: Sql,
  databaseName: string,
) {
  assertSafeDatabaseName(databaseName);

  await provisioningSql.unsafe(`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = '${databaseName.replaceAll("'", "''")}'
      and pid <> pg_backend_pid()
  `);

  await provisioningSql.unsafe(
    `drop database if exists ${quoteIdentifier(databaseName)}`,
  );
}

async function verifyFinalState(controlSql: Sql) {
  const checks: Array<[string, number, string]> = [
    [
      "users",
      1,
      `select count(*)::int as count from users`,
    ],
    [
      "default superadmin",
      1,
      `
        select count(*)::int as count
        from users
        where lower(email) = lower('${DEFAULT_USER_EMAIL.replaceAll("'", "''")}')
          and global_role = 'SUPER_ADMIN'
          and status = 'active'
          and deleted_at is null
      `,
    ],
    [
      "tenants",
      1,
      `select count(*)::int as count from tenants`,
    ],
    [
      "humanet tenant",
      1,
      `
        select count(*)::int as count
        from tenants
        where slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
          and status = 'active'
          and deleted_at is null
      `,
    ],
    [
      "tenant memberships",
      1,
      `select count(*)::int as count from tenant_memberships`,
    ],
    [
      "humanet tenant connection",
      1,
      `
        select count(*)::int as count
        from tenant_database_connections c
        inner join tenants t on t.id = c.tenant_id
        where t.slug = '${DEFAULT_TENANT_SLUG.replaceAll("'", "''")}'
          and c.deleted_at is null
      `,
    ],
    [
      "report access orders",
      0,
      `select count(*)::int as count from report_access_orders`,
    ],
    [
      "report access grants",
      0,
      `select count(*)::int as count from report_access_grants`,
    ],
    [
      "billing profiles",
      0,
      `select count(*)::int as count from billing_profiles`,
    ],
    [
      "assessment invitation index",
      0,
      `select count(*)::int as count from assessment_invitation_index`,
    ],
  ];

  for (const [label, expected, query] of checks) {
    const actual = await scalarCount(controlSql, query);

    if (actual !== expected) {
      throw new Error(
        `Kontrola końcowa nie przeszła: ${label}; oczekiwano ${expected}, otrzymano ${actual}.`,
      );
    }
  }

  const issues = await validateBaseline(controlSql);

  if (issues.length > 0) {
    throw new Error(
      `Kontrola kompletności publikacyjnej nie przeszła:\n${issues
        .map((issue) => `- ${issue.code}: ${issue.message}`)
        .join("\n")}`,
    );
  }
}

async function main() {
  loadEnvironment();

  const mode = parseMode();
  const dropOtherTenantDatabases = hasFlag(
    "--drop-other-tenant-databases",
  );

  const controlDatabaseUrl = requireEnv("CONTROL_DATABASE_URL");
  const encryptionKey = requireEnv("DATABASE_ENCRYPTION_KEY");

  const controlSql = postgres(controlDatabaseUrl, { max: 1 });

  try {
    console.log("HUMANET VALUES — reset do stanu bazowego");
    console.log(`Tryb: ${mode.toUpperCase()}`);
    console.log(`Domyślny użytkownik: ${DEFAULT_USER_EMAIL}`);
    console.log(`Domyślny tenant: ${DEFAULT_TENANT_SLUG}`);
    console.log(
      `Usuwanie fizycznych baz innych tenantów: ${
        dropOtherTenantDatabases ? "TAK" : "NIE"
      }`,
    );

    const validationIssues = await validateBaseline(controlSql);

    if (validationIssues.length > 0) {
      console.error("\nWalidacja przed resetem nie przeszła:");

      for (const issue of validationIssues) {
        console.error(`- ${issue.code}: ${issue.message}`);
      }

      throw new Error("Przerwano reset z powodu niespójności danych.");
    }

    printCounts(
      "Control DB — dane zachowywane",
      await getPreviewCounts(controlSql),
    );

    const tenantConnections = await getTenantConnections(controlSql);

    for (const tenant of tenantConnections) {
      const databaseUrl = decryptSecret(
        tenant.databaseUrlEncrypted,
        encryptionKey,
      );
      const tenantSql = postgres(databaseUrl, { max: 1 });

      try {
        printCounts(
          `Tenant DB ${tenant.tenantSlug} (${tenant.databaseName}) — dane do usunięcia`,
          await countTenantRows(tenantSql),
        );
      } finally {
        await tenantSql.end();
      }
    }

    if (mode === "preview") {
      console.log("\nPodgląd zakończony. Nie zmieniono żadnych danych.");
      console.log("\nWykonanie:");
      console.log(
        `${CONFIRMATION_ENV}=${CONFIRMATION_VALUE} npm run db:reset-baseline:execute`,
      );
      console.log("\nWykonanie z fizycznym usunięciem innych baz tenantowych:");
      console.log(
        `${CONFIRMATION_ENV}=${CONFIRMATION_VALUE} npm run db:reset-baseline:execute -- --drop-other-tenant-databases`,
      );
      return;
    }

    if (process.env[CONFIRMATION_ENV] !== CONFIRMATION_VALUE) {
      throw new Error(
        `Ustaw ${CONFIRMATION_ENV}=${CONFIRMATION_VALUE}, aby potwierdzić nieodwracalny reset.`,
      );
    }

    const defaultTenant = tenantConnections.find(
      (tenant) => tenant.tenantSlug === DEFAULT_TENANT_SLUG,
    );

    if (!defaultTenant) {
      throw new Error(
        `Nie znaleziono połączenia bazy domyślnego tenanta ${DEFAULT_TENANT_SLUG}.`,
      );
    }

    /*
     * Najpierw czyścimy bazę humanet oraz pozostałe bazy tenantowe.
     * Control DB jest resetowana dopiero po poprawnym zakończeniu tego etapu.
     */
    for (const tenant of tenantConnections) {
      const databaseUrl = decryptSecret(
        tenant.databaseUrlEncrypted,
        encryptionKey,
      );

      if (
        tenant.tenantSlug !== DEFAULT_TENANT_SLUG &&
        dropOtherTenantDatabases
      ) {
        continue;
      }

      console.log(`\nCzyszczenie tenant DB: ${tenant.tenantSlug}`);
      await resetTenantDatabase(databaseUrl);
    }

    if (dropOtherTenantDatabases) {
      const provisioningDatabaseUrl = requireEnv(
        "DATABASE_PROVISIONING_URL",
      );
      const provisioningSql = postgres(provisioningDatabaseUrl, { max: 1 });

      try {
        for (const tenant of tenantConnections) {
          if (tenant.tenantSlug === DEFAULT_TENANT_SLUG) {
            continue;
          }

          console.log(
            `\nUsuwanie bazy ${tenant.databaseName} dla tenanta ${tenant.tenantSlug}`,
          );
          await dropDatabase(provisioningSql, tenant.databaseName);
        }
      } finally {
        await provisioningSql.end();
      }
    }

    console.log("\nReset control DB...");
    await resetControlDatabase(controlSql);

    console.log("\nKontrola końcowa...");
    await verifyFinalState(controlSql);

    const defaultDatabaseUrl = decryptSecret(
      defaultTenant.databaseUrlEncrypted,
      encryptionKey,
    );
    const defaultTenantSql = postgres(defaultDatabaseUrl, { max: 1 });

    try {
      const remainingRows = (
        await countTenantRows(defaultTenantSql)
      ).reduce((sum, row) => sum + row.count, 0);

      if (remainingRows !== 0) {
        throw new Error(
          `Baza tenanta ${DEFAULT_TENANT_SLUG} nie jest pusta. Pozostało rekordów: ${remainingRows}.`,
        );
      }
    } finally {
      await defaultTenantSql.end();
    }

    console.log("\nRESET ZAKOŃCZONY POMYŚLNIE");
    console.log(`Pozostawiono użytkownika: ${DEFAULT_USER_EMAIL}`);
    console.log(`Pozostawiono tenant: ${DEFAULT_TENANT_SLUG}`);
    console.log(
      "Pozostawiono aktywne wersje kwestionariuszy, aktywne wersje raportów wraz ze stronami oraz aktualne produkty.",
    );
  } finally {
    await controlSql.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nBŁĄD: ${message}`);
  process.exitCode = 1;
});
