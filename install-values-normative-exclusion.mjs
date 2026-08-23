#!/usr/bin/env node

/**
 * HUMANET VALUES — normative profile exclusion installer
 * Repository: cdziugiel/values
 *
 * Commands:
 *   node install-values-normative-exclusion-v1.1.mjs check
 *   node install-values-normative-exclusion-v1.1.mjs apply
 *   node install-values-normative-exclusion-v1.1.mjs verify [--full]
 *   node install-values-normative-exclusion-v1.1.mjs rollback [--full] [--force]
 *
 * apply generates (but DOES NOT execute) a Drizzle control-DB migration.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const INSTALLER_ID = "values-normative-exclusion-v1.1";
const MARKER = "@humanet-normative-exclusion-v1";
const TEST_MARKER = "@humanet-normative-exclusion-v1.1-test-contract";
const BACKUP_ROOT = path.join(ROOT, ".humanet-installer-backups", INSTALLER_ID);

const PATHS = {
  packageJson: "package.json",
  schema: "drizzle/schema/control/normative-profiles.ts",
  queries: "features/normative-data/api/normative-admin.queries.ts",
  types: "features/normative-data/types/normative-admin.types.ts",
  list: "features/normative-data/components/normative-profiles-admin-page.tsx",
  detail: "features/normative-data/components/normative-profile-admin-detail.tsx",
  page: "app/(protected)/dashboard/normative-data/page.tsx",
  action: "features/normative-data/api/normative-admin.actions.ts",
  control: "features/normative-data/components/normative-profile-exclusion-control.tsx",
  csvTest: "features/normative-data/lib/normative-profile-csv.test.ts",
  migrationDir: "drizzle/migrations/control",
  journal: "drizzle/migrations/control/meta/_journal.json",
};

const CODE_BACKUP_PATHS = [
  PATHS.queries,
  PATHS.types,
  PATHS.list,
  PATHS.detail,
  PATHS.page,
  PATHS.csvTest,
];

const FULL_BACKUP_PATHS = [
  PATHS.schema,
  PATHS.journal,
  ...CODE_BACKUP_PATHS,
];

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  return fs.readFileSync(abs(rel), "utf8");
}

function write(rel, content) {
  const target = abs(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function sha256Content(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function sha256File(rel) {
  return exists(rel) ? sha256Content(read(rel)) : null;
}

function fail(message) {
  throw new Error(message);
}

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function run(command, args, { allowFailure = false, env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    if (allowFailure) return result;
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    fail(`Polecenie nie powiodło się (${result.status}): ${command} ${args.join(" ")}`);
  }
  return result;
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.error || result.status !== 0) return null;
  return (result.stdout || "").trim();
}

function replaceOnce(text, needle, replacement, label) {
  const first = text.indexOf(needle);
  if (first < 0) fail(`Nie znaleziono kotwicy: ${label}`);
  const second = text.indexOf(needle, first + needle.length);
  if (second >= 0) fail(`Kotwica nie jest unikalna: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + needle.length);
}

function insertBeforeOnce(text, needle, insertion, label) {
  return replaceOnce(text, needle, `${insertion}${needle}`, label);
}

function isCoreInstalled() {
  return (
    exists(PATHS.action) &&
    exists(PATHS.control) &&
    read(PATHS.action).includes(MARKER) &&
    read(PATHS.control).includes(MARKER) &&
    exists(PATHS.schema) &&
    read(PATHS.schema).includes("excludedFromNorms") &&
    exists(PATHS.queries) &&
    read(PATHS.queries).includes(MARKER)
  );
}

function isInstalled() {
  return (
    isCoreInstalled() &&
    exists(PATHS.csvTest) &&
    read(PATHS.csvTest).includes("excludedFromNorms: false")
  );
}

function validateRepo() {
  if (!exists(PATHS.packageJson)) fail("Uruchom instalator z katalogu głównego repozytorium values.");
  const pkg = JSON.parse(read(PATHS.packageJson));
  if (pkg.name !== "humanet-values") {
    fail(`To nie jest repozytorium HUMANET VALUES (package.json name=${JSON.stringify(pkg.name)}).`);
  }

  for (const rel of [
    PATHS.schema,
    PATHS.queries,
    PATHS.types,
    PATHS.list,
    PATHS.detail,
    PATHS.page,
    PATHS.csvTest,
    PATHS.journal,
  ]) {
    if (!exists(rel)) fail(`Brakuje oczekiwanego pliku: ${rel}`);
  }

  const origin = capture("git", ["remote", "get-url", "origin"]);
  if (origin && !/(^|[/:])cdziugiel[/:]values(?:\.git)?$/i.test(origin)) {
    fail(`Repozytorium ma nieoczekiwany origin: ${origin}\nOczekiwano cdziugiel/values.`);
  }
}

function ensureTargetFilesClean(force) {
  const targetPaths = [
    PATHS.schema,
    PATHS.queries,
    PATHS.types,
    PATHS.list,
    PATHS.detail,
    PATHS.page,
    PATHS.csvTest,
    PATHS.migrationDir,
  ];
  const output = capture("git", ["status", "--porcelain", "--", ...targetPaths]);
  if (output && !force) {
    fail(
      "W plikach modyfikowanych przez instalator są lokalne zmiany.\n" +
      output +
      "\nZacommituj/schowaj je albo uruchom apply --force (backup i tak zostanie wykonany).",
    );
  }
}

function ensurePathClean(rel, force) {
  const output = capture("git", ["status", "--porcelain", "--", rel]);
  if (output && !force) {
    fail(
      `Plik ${rel} ma lokalne zmiany.\n${output}\nZacommituj/schowaj je albo uruchom apply --force.`,
    );
  }
}

function listFilesRecursive(relDir) {
  const root = abs(relDir);
  if (!fs.existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.push(path.relative(ROOT, p).split(path.sep).join("/"));
    }
  };
  walk(root);
  return out.sort();
}

function createBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(BACKUP_ROOT, stamp);
  fs.mkdirSync(dir, { recursive: true });

  for (const rel of FULL_BACKUP_PATHS) {
    if (!exists(rel)) continue;
    const target = path.join(dir, "files", rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(abs(rel), target);
  }

  const manifest = {
    installerId: INSTALLER_ID,
    createdAt: new Date().toISOString(),
    root: ROOT,
    codeBackupPaths: CODE_BACKUP_PATHS,
    fullBackupPaths: FULL_BACKUP_PATHS,
    createdFiles: [],
    generatedMigrationFiles: [],
    beforeMigrationFiles: listFilesRecursive(PATHS.migrationDir),
    postHashes: {},
  };

  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return { dir, manifest };
}

function saveManifest(backup) {
  fs.writeFileSync(
    path.join(backup.dir, "manifest.json"),
    JSON.stringify(backup.manifest, null, 2),
  );
}

function restoreBackupFile(backupDir, rel) {
  const source = path.join(backupDir, "files", rel);
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.copyFileSync(source, abs(rel));
}

function patchSchema() {
  let text = read(PATHS.schema);
  if (text.includes("excludedFromNorms")) return;

  text = replaceOnce(
    text,
    'import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";',
    'import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";',
    "normative-profiles import pg-core",
  );

  text = replaceOnce(
    text,
    '    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),\n    ...timestamps,',
    `    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),\n\n    // ${MARKER}: manual quality-control exclusion; never hard-delete research observations.\n    excludedFromNorms: boolean("excluded_from_norms").notNull().default(false),\n    normativeExclusionReason: text("normative_exclusion_reason"),\n    normativeExcludedAt: timestamp("normative_excluded_at", { withTimezone: true }),\n    normativeExcludedByUserId: uuid("normative_excluded_by_user_id").references(() => users.id, {\n      onDelete: "set null",\n    }),\n\n    ...timestamps,`,
    "normative-profiles exclusion columns",
  );

  text = replaceOnce(
    text,
    '    index("normative_profiles_completed_at_idx").on(table.completedAt),\n    index("normative_profiles_deleted_at_idx").on(table.deletedAt),',
    '    index("normative_profiles_completed_at_idx").on(table.completedAt),\n    index("normative_profiles_excluded_from_norms_idx").on(table.excludedFromNorms),\n    index("normative_profiles_deleted_at_idx").on(table.deletedAt),',
    "normative-profiles exclusion index",
  );

  write(PATHS.schema, text);
}

function patchTypes() {
  let text = read(PATHS.types);
  if (text.includes(MARKER)) return;

  text = replaceOnce(
    text,
    "  revision: number;\n  ageAtAssessment: number | null;",
    `  revision: number;\n  // ${MARKER}\n  excludedFromNorms: boolean;\n  ageAtAssessment: number | null;`,
    "normative admin row exclusion flag",
  );

  text = replaceOnce(
    text,
    "  rewardRevokedAt: string | null;\n};",
    "  rewardRevokedAt: string | null;\n  normativeExclusionReason: string | null;\n  normativeExcludedAt: string | null;\n  normativeExcludedByUserId: string | null;\n};",
    "normative admin detail exclusion metadata",
  );

  text = replaceOnce(
    text,
    '  rewardStatus?: "all" | NormativeProfileRewardStatus;\n  page?: number;',
    '  rewardStatus?: "all" | NormativeProfileRewardStatus;\n  inclusionStatus?: "all" | "included" | "excluded";\n  page?: number;',
    "normative admin inclusion filter type",
  );

  text += `\n\nexport type NormativeProfileExclusionActionResult = {\n  status: "success" | "error";\n  message: string;\n};\n`;
  write(PATHS.types, text);
}

function patchCsvTest() {
  let text = read(PATHS.csvTest);
  if (text.includes("excludedFromNorms: false")) return;

  text = replaceOnce(
    text,
    '        revision: 1,\n        ageAtAssessment: 36,',
    `        revision: 1,\n        excludedFromNorms: false, // ${TEST_MARKER}\n        ageAtAssessment: 36,`,
    "normative CSV test DTO exclusion flag",
  );

  write(PATHS.csvTest, text);
}

function patchQueries() {
  let text = read(PATHS.queries);
  if (text.includes(MARKER)) return;

  text = insertBeforeOnce(
    text,
    "  return and(...conditions);",
    `  // ${MARKER}: admin can inspect all records, while analytical/export flows can request only included observations.\n  if (filters.inclusionStatus === "included") {\n    conditions.push(eq(normativeProfiles.excludedFromNorms, false));\n  }\n\n  if (filters.inclusionStatus === "excluded") {\n    conditions.push(eq(normativeProfiles.excludedFromNorms, true));\n  }\n\n`,
    "normative admin where inclusion status",
  );

  text = replaceOnce(
    text,
    "    revision: normativeProfiles.revision,\n\n    sex: normativeProfiles.sex,",
    "    revision: normativeProfiles.revision,\n    excludedFromNorms: normativeProfiles.excludedFromNorms,\n\n    sex: normativeProfiles.sex,",
    "normative admin list selection exclusion flag",
  );

  text = replaceOnce(
    text,
    "        revision:\n          normativeProfiles.revision,\n\n        dateOfBirth:",
    "        revision:\n          normativeProfiles.revision,\n        excludedFromNorms:\n          normativeProfiles.excludedFromNorms,\n\n        dateOfBirth:",
    "normative admin detail selection exclusion flag",
  );

  text = replaceOnce(
    text,
    "        completedAt:\n          normativeProfiles.completedAt,\n\n        consentId:",
    "        completedAt:\n          normativeProfiles.completedAt,\n        normativeExclusionReason:\n          normativeProfiles.normativeExclusionReason,\n        normativeExcludedAt:\n          normativeProfiles.normativeExcludedAt,\n        normativeExcludedByUserId:\n          normativeProfiles.normativeExcludedByUserId,\n\n        consentId:",
    "normative admin detail exclusion metadata selection",
  );

  text = replaceOnce(
    text,
    "    completedAt:\n      profile.completedAt.toISOString(),\n\n    consentAcceptedAt:",
    "    completedAt:\n      profile.completedAt.toISOString(),\n\n    normativeExclusionReason:\n      profile.normativeExclusionReason ?? null,\n\n    normativeExcludedAt: iso(\n      profile.normativeExcludedAt,\n    ),\n\n    normativeExcludedByUserId:\n      profile.normativeExcludedByUserId ?? null,\n\n    consentAcceptedAt:",
    "normative admin detail exclusion metadata mapping",
  );

  text = replaceOnce(
    text,
    "        page: 1,\n        pageSize: MAX_PAGE_SIZE,",
    `        page: 1,\n        pageSize: MAX_PAGE_SIZE,\n        // ${MARKER}: exports are analytical datasets, so manually rejected observations must not leave the system as valid norm data.\n        inclusionStatus: "included",`,
    "normative export excludes rejected profiles",
  );

  write(PATHS.queries, text);
}

function patchPage() {
  let text = read(PATHS.page);
  if (text.includes(MARKER)) return;

  text = replaceOnce(
    text,
    'type PageProps = { searchParams: Promise<{ query?: string; consentStatus?: "all"|"active"|"withdrawn"; rewardStatus?: "all"|"pending"|"issued"|"redeemed"|"expired"|"revoked"; page?: string; }> };',
    `// ${MARKER}\ntype PageProps = { searchParams: Promise<{ query?: string; consentStatus?: "all"|"active"|"withdrawn"; rewardStatus?: "all"|"pending"|"issued"|"redeemed"|"expired"|"revoked"; inclusionStatus?: "all"|"included"|"excluded"; page?: string; }> };`,
    "normative admin page searchParams",
  );

  text = replaceOnce(
    text,
    "  const filters = { query: p.query, consentStatus: p.consentStatus, rewardStatus: p.rewardStatus, page: Number(p.page || 1) };",
    "  const filters = { query: p.query, consentStatus: p.consentStatus, rewardStatus: p.rewardStatus, inclusionStatus: p.inclusionStatus, page: Number(p.page || 1) };",
    "normative admin page inclusion filter",
  );

  write(PATHS.page, text);
}

function patchList() {
  let text = read(PATHS.list);
  if (text.includes(MARKER)) return;

  text = replaceOnce(
    text,
    '  if (filters.rewardStatus && filters.rewardStatus !== "all") p.set("rewardStatus", filters.rewardStatus);\n  p.set("page", String(page));',
    `  if (filters.rewardStatus && filters.rewardStatus !== "all") p.set("rewardStatus", filters.rewardStatus);\n  // ${MARKER}\n  if (filters.inclusionStatus && filters.inclusionStatus !== "all") p.set("inclusionStatus", filters.inclusionStatus);\n  p.set("page", String(page));`,
    "normative list pagination inclusion filter",
  );

  text = replaceOnce(
    text,
    '        <Button asChild variant="outline"><a href="/dashboard/normative-data/export">Eksport CSV</a></Button>',
    '        <Button asChild variant="outline"><a href="/dashboard/normative-data/export">Eksport CSV (tylko włączone)</a></Button>',
    "normative export label",
  );

  text = replaceOnce(
    text,
    '        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">',
    '        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_210px_210px_190px_auto]">',
    "normative admin filter grid",
  );

  text = replaceOnce(
    text,
    '          </select>\n          <Button type="submit">Filtruj</Button>',
    `          </select>\n          <select name="inclusionStatus" defaultValue={filters.inclusionStatus ?? "all"} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Status w danych normatywnych">\n            <option value="all">Wszystkie rekordy</option><option value="included">Włączone do analiz</option><option value="excluded">Wyłączone z analiz</option>\n          </select>\n          <Button type="submit">Filtruj</Button>`,
    "normative admin inclusion filter select",
  );

  text = replaceOnce(
    text,
    '<th className="px-4 py-3">Użytkownik</th><th className="px-4 py-3">Profil</th><th className="px-4 py-3">Demografia</th>',
    '<th className="px-4 py-3">Użytkownik</th><th className="px-4 py-3">Profil</th><th className="px-4 py-3">Do analiz</th><th className="px-4 py-3">Demografia</th>',
    "normative admin table status header",
  );

  text = replaceOnce(
    text,
    '            <tbody>{data.rows.map(row => <tr key={row.profileId} className="border-t align-top">',
    '            <tbody>{data.rows.map(row => <tr key={row.profileId} className={row.excludedFromNorms ? "border-t bg-destructive/5 align-top" : "border-t align-top"}>',
    "normative admin excluded row style",
  );

  text = replaceOnce(
    text,
    '              <td className="px-4 py-3"><div className="font-mono text-xs">{row.profileId}</div><div className="text-xs text-muted-foreground">rew. {row.revision}</div></td>\n              <td className="px-4 py-3"><div>{row.ageAtAssessment ?? "—"} lat</div>',
    '              <td className="px-4 py-3"><div className="font-mono text-xs">{row.profileId}</div><div className="text-xs text-muted-foreground">rew. {row.revision}</div></td>\n              <td className="px-4 py-3">{row.excludedFromNorms ? <Badge variant="destructive">Wyłączony</Badge> : <Badge variant="outline">Włączony</Badge>}</td>\n              <td className="px-4 py-3"><div>{row.ageAtAssessment ?? "—"} lat</div>',
    "normative admin status cell",
  );

  text = text.replace('min-w-[1100px]', 'min-w-[1220px]');
  write(PATHS.list, text);
}

function patchDetail() {
  let text = read(PATHS.detail);
  if (text.includes(MARKER)) return;

  text = replaceOnce(
    text,
    'import { Button } from "@/components/ui/button";',
    'import { Badge } from "@/components/ui/badge";\nimport { Button } from "@/components/ui/button";',
    "normative detail badge import",
  );

  text = replaceOnce(
    text,
    'import type { NormativeProfileAdminDetailDto } from "../types/normative-admin.types";',
    `import type { NormativeProfileAdminDetailDto } from "../types/normative-admin.types";\nimport { NormativeProfileExclusionControl } from "./normative-profile-exclusion-control";\n// ${MARKER}`,
    "normative detail exclusion control import",
  );

  const oldHeader = '<PageHeader title="Profil normatywny" description="Globalny profil użytkownika i jego powiązania ze wszystkimi tenantami." actions={<Button asChild variant="outline"><Link href="/dashboard/normative-data">Wróć</Link></Button>} />';
  const newHeader = '<PageHeader title="Profil normatywny" description="Globalny profil użytkownika i jego powiązania ze wszystkimi tenantami." actions={<div className="flex flex-wrap items-center gap-2"><NormativeProfileExclusionControl profileId={profile.profileId} excludedFromNorms={profile.excludedFromNorms} /><Button asChild variant="outline"><Link href="/dashboard/normative-data">Wróć</Link></Button></div>} />\n    <Card className={profile.excludedFromNorms ? "border-destructive/40" : undefined}><CardHeader><CardTitle>Status w danych normatywnych</CardTitle></CardHeader><CardContent><dl>\n      <Row label="Status" value={profile.excludedFromNorms ? <Badge variant="destructive">Wyłączony z dalszych analiz</Badge> : <Badge variant="outline">Włączony do analiz</Badge>} />\n      {profile.excludedFromNorms ? <><Row label="Powód wyłączenia" value={profile.normativeExclusionReason} /><Row label="Wyłączono" value={profile.normativeExcludedAt} /><Row label="SUPER_ADMIN" value={profile.normativeExcludedByUserId ? <span className="font-mono text-xs">{profile.normativeExcludedByUserId}</span> : "—"} /></> : null}\n    </dl></CardContent></Card>';

  text = replaceOnce(text, oldHeader, newHeader, "normative detail page header/actions");
  write(PATHS.detail, text);
}

const ACTION_FILE = `"use server";\n\n// ${MARKER}\nimport { and, eq, isNull } from "drizzle-orm";\nimport { revalidatePath } from "next/cache";\nimport { z } from "zod";\n\nimport { normativeProfiles } from "@/drizzle/schema/control";\nimport { writeSystemAuditLog } from "@/server/audit/write-system-audit-log";\nimport { requireSuperAdmin } from "@/server/auth/require-super-admin";\nimport { controlDb } from "@/server/db/control-db";\n\nimport type { NormativeProfileExclusionActionResult } from "../types/normative-admin.types";\n\nconst inputSchema = z.object({\n  profileId: z.string().uuid(),\n  intent: z.enum(["exclude", "restore"]),\n  reason: z.string().trim().max(500).optional(),\n});\n\nexport async function setNormativeProfileExclusionAction(\n  input: unknown,\n): Promise<NormativeProfileExclusionActionResult> {\n  const admin = await requireSuperAdmin();\n  const parsed = inputSchema.safeParse(input);\n\n  if (!parsed.success) {\n    return {\n      status: "error",\n      message: "Nieprawidłowe dane operacji.",\n    };\n  }\n\n  const reason = parsed.data.reason?.trim() ?? "";\n\n  if (parsed.data.intent === "exclude" && reason.length < 5) {\n    return {\n      status: "error",\n      message: "Podaj krótki powód wyłączenia rekordu (minimum 5 znaków).",\n    };\n  }\n\n  const [current] = await controlDb\n    .select({\n      id: normativeProfiles.id,\n      excludedFromNorms: normativeProfiles.excludedFromNorms,\n      normativeExclusionReason: normativeProfiles.normativeExclusionReason,\n      normativeExcludedAt: normativeProfiles.normativeExcludedAt,\n      normativeExcludedByUserId: normativeProfiles.normativeExcludedByUserId,\n    })\n    .from(normativeProfiles)\n    .where(\n      and(\n        eq(normativeProfiles.id, parsed.data.profileId),\n        isNull(normativeProfiles.deletedAt),\n      ),\n    )\n    .limit(1);\n\n  if (!current) {\n    return {\n      status: "error",\n      message: "Nie znaleziono profilu normatywnego.",\n    };\n  }\n\n  const shouldExclude = parsed.data.intent === "exclude";\n\n  if (current.excludedFromNorms === shouldExclude) {\n    return {\n      status: "success",\n      message: shouldExclude\n        ? "Rekord jest już wyłączony z analiz."\n        : "Rekord jest już włączony do analiz.",\n    };\n  }\n\n  const now = new Date();\n\n  try {\n    const [updated] = await controlDb\n      .update(normativeProfiles)\n      .set({\n        excludedFromNorms: shouldExclude,\n        normativeExclusionReason: shouldExclude ? reason : null,\n        normativeExcludedAt: shouldExclude ? now : null,\n        normativeExcludedByUserId: shouldExclude ? admin.id : null,\n        updatedAt: now,\n        updatedBy: admin.id,\n      })\n      .where(\n        and(\n          eq(normativeProfiles.id, parsed.data.profileId),\n          isNull(normativeProfiles.deletedAt),\n        ),\n      )\n      .returning({\n        id: normativeProfiles.id,\n        excludedFromNorms: normativeProfiles.excludedFromNorms,\n        normativeExclusionReason: normativeProfiles.normativeExclusionReason,\n        normativeExcludedAt: normativeProfiles.normativeExcludedAt,\n        normativeExcludedByUserId: normativeProfiles.normativeExcludedByUserId,\n      });\n\n    if (!updated) {\n      return {\n        status: "error",\n        message: "Nie udało się zmienić statusu profilu.",\n      };\n    }\n\n    await writeSystemAuditLog({\n      actorUserId: admin.id,\n      actorRole: "SUPER_ADMIN",\n      action: shouldExclude\n        ? "normative_profile.excluded_from_norms"\n        : "normative_profile.restored_to_norms",\n      entityType: "normative_profile",\n      entityId: updated.id,\n      before: {\n        excludedFromNorms: current.excludedFromNorms,\n        normativeExclusionReason: current.normativeExclusionReason,\n        normativeExcludedAt: current.normativeExcludedAt?.toISOString() ?? null,\n        normativeExcludedByUserId: current.normativeExcludedByUserId,\n      },\n      after: {\n        excludedFromNorms: updated.excludedFromNorms,\n        normativeExclusionReason: updated.normativeExclusionReason,\n        normativeExcludedAt: updated.normativeExcludedAt?.toISOString() ?? null,\n        normativeExcludedByUserId: updated.normativeExcludedByUserId,\n      },\n    });\n\n    revalidatePath("/dashboard/normative-data");\n    revalidatePath("/dashboard/normative-data/" + updated.id);\n\n    return {\n      status: "success",\n      message: shouldExclude\n        ? "Rekord został wyłączony z dalszych analiz normatywnych."\n        : "Rekord został przywrócony do analiz normatywnych.",\n    };\n  } catch {\n    return {\n      status: "error",\n      message: "Nie udało się zmienić statusu profilu. Spróbuj ponownie.",\n    };\n  }\n}\n`;

const CONTROL_FILE = `"use client";\n\n// ${MARKER}\nimport { useState, useTransition, type FormEvent } from "react";\nimport { useRouter } from "next/navigation";\n\nimport { Button } from "@/components/ui/button";\nimport {\n  Dialog,\n  DialogClose,\n  DialogContent,\n  DialogDescription,\n  DialogFooter,\n  DialogHeader,\n  DialogTitle,\n  DialogTrigger,\n} from "@/components/ui/dialog";\nimport { Textarea } from "@/components/ui/textarea";\n\nimport { setNormativeProfileExclusionAction } from "../api/normative-admin.actions";\n\nexport function NormativeProfileExclusionControl({\n  profileId,\n  excludedFromNorms,\n}: {\n  profileId: string;\n  excludedFromNorms: boolean;\n}) {\n  const router = useRouter();\n  const [open, setOpen] = useState(false);\n  const [reason, setReason] = useState("");\n  const [message, setMessage] = useState<string | null>(null);\n  const [pending, startTransition] = useTransition();\n\n  const isRestore = excludedFromNorms;\n  const validReason = isRestore || reason.trim().length >= 5;\n\n  function handleOpenChange(nextOpen: boolean) {\n    setOpen(nextOpen);\n    if (nextOpen) {\n      setReason("");\n      setMessage(null);\n    }\n  }\n\n  function handleSubmit(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    if (!validReason || pending) return;\n\n    setMessage(null);\n\n    startTransition(async () => {\n      const result = await setNormativeProfileExclusionAction({\n        profileId,\n        intent: isRestore ? "restore" : "exclude",\n        reason: isRestore ? undefined : reason,\n      });\n\n      if (result.status === "error") {\n        setMessage(result.message);\n        return;\n      }\n\n      setOpen(false);\n      setReason("");\n      router.refresh();\n    });\n  }\n\n  return (\n    <Dialog open={open} onOpenChange={handleOpenChange}>\n      <DialogTrigger asChild>\n        <Button variant={isRestore ? "outline" : "destructive"}>\n          {isRestore ? "Przywróć do analiz" : "Wyłącz z analiz"}\n        </Button>\n      </DialogTrigger>\n\n      <DialogContent className="sm:max-w-lg">\n        <form onSubmit={handleSubmit} className="space-y-4">\n          <DialogHeader>\n            <DialogTitle>\n              {isRestore\n                ? "Przywrócić rekord do analiz normatywnych?"\n                : "Wyłączyć rekord z analiz normatywnych?"}\n            </DialogTitle>\n            <DialogDescription>\n              {isRestore\n                ? "Rekord ponownie będzie traktowany jako poprawna obserwacja w eksportach i dalszych analizach normatywnych."\n                : "Rekord pozostanie w rejestrze i audycie, ale nie będzie traktowany jako poprawna obserwacja w eksportach i dalszych analizach normatywnych."}\n            </DialogDescription>\n          </DialogHeader>\n\n          {!isRestore ? (\n            <div className="space-y-2">\n              <label htmlFor="normative-exclusion-reason" className="text-sm font-medium">\n                Powód wyłączenia\n              </label>\n              <Textarea\n                id="normative-exclusion-reason"\n                value={reason}\n                onChange={(event) => setReason(event.target.value)}\n                placeholder="Np. niewiarygodna data urodzenia / ewidentnie nierzetelne dane"\n                minLength={5}\n                maxLength={500}\n                required\n                disabled={pending}\n                autoFocus\n              />\n              <p className="text-xs text-muted-foreground">\n                Powód zostanie zapisany przy rekordzie oraz w audycie systemowym.\n              </p>\n            </div>\n          ) : null}\n\n          {message ? (\n            <p className="text-sm text-destructive" role="alert">\n              {message}\n            </p>\n          ) : null}\n\n          <DialogFooter>\n            <DialogClose asChild>\n              <Button type="button" variant="outline" disabled={pending}>\n                Anuluj\n              </Button>\n            </DialogClose>\n            <Button\n              type="submit"\n              variant={isRestore ? "default" : "destructive"}\n              disabled={!validReason || pending}\n            >\n              {pending\n                ? "Zapisywanie…"\n                : isRestore\n                  ? "Przywróć do analiz"\n                  : "Wyłącz z analiz"}\n            </Button>\n          </DialogFooter>\n        </form>\n      </DialogContent>\n    </Dialog>\n  );\n}\n`;

function createNewFiles(backup) {
  for (const rel of [PATHS.action, PATHS.control]) {
    if (exists(rel)) {
      if (read(rel).includes(MARKER)) continue;
      fail(`Plik już istnieje i nie należy do tego instalatora: ${rel}`);
    }
  }

  if (!exists(PATHS.action)) {
    write(PATHS.action, ACTION_FILE);
    backup.manifest.createdFiles.push(PATHS.action);
  }
  if (!exists(PATHS.control)) {
    write(PATHS.control, CONTROL_FILE);
    backup.manifest.createdFiles.push(PATHS.control);
  }
}

function generateMigration(backup) {
  const before = new Set(backup.manifest.beforeMigrationFiles);

  log("\nGeneruję migrację Drizzle dla control DB (bez uruchamiania jej na bazie)...");
  const env = {
    ...process.env,
    // drizzle.config.ts wymaga URL już przy ładowaniu configu; generate nie powinno łączyć się z DB.
    CONTROL_DATABASE_URL:
      process.env.CONTROL_DATABASE_URL ||
      "postgres://drizzle:drizzle@127.0.0.1:1/drizzle",
  };

  run("npm", ["run", "db:generate", "--", "--name=humanet_normative_profile_exclusion"], { env });

  const after = listFilesRecursive(PATHS.migrationDir);
  const added = after.filter((rel) => !before.has(rel));
  backup.manifest.generatedMigrationFiles = added;

  const migrationSqlFiles = after.filter((rel) => rel.endsWith(".sql"));
  const matching = migrationSqlFiles.filter((rel) => {
    try {
      return read(rel).includes("excluded_from_norms");
    } catch {
      return false;
    }
  });

  if (matching.length === 0) {
    fail("Drizzle nie wygenerował migracji zawierającej kolumnę excluded_from_norms.");
  }

  log(`Migracja przygotowana: ${matching[matching.length - 1]}`);
}

function staticVerify({ throwOnError = true } = {}) {
  const checks = [
    [PATHS.schema, "excludedFromNorms", "schema: pole excludedFromNorms"],
    [PATHS.schema, 'boolean("excluded_from_norms")', "schema: kolumna excluded_from_norms"],
    [PATHS.queries, MARKER, "queries: marker instalatora"],
    [PATHS.queries, 'inclusionStatus: "included"', "export: tylko rekordy włączone"],
    [PATHS.types, "excludedFromNorms: boolean", "DTO: status wyłączenia"],
    [PATHS.csvTest, "excludedFromNorms: false", "test CSV: fixture zgodny z DTO"],
    [PATHS.list, 'name="inclusionStatus"', "UI listy: filtr statusu"],
    [PATHS.list, "Wyłączony", "UI listy: badge statusu"],
    [PATHS.detail, "NormativeProfileExclusionControl", "UI szczegółu: kontrolka wyłączenia"],
    [PATHS.page, "inclusionStatus", "route: filtr statusu"],
    [PATHS.action, "normative_profile.excluded_from_norms", "audit: wyłączenie"],
    [PATHS.action, "normative_profile.restored_to_norms", "audit: przywrócenie"],
    [PATHS.control, "Wyłącz z analiz", "UI: akcja wyłączenia"],
    [PATHS.control, "Przywróć do analiz", "UI: akcja przywrócenia"],
  ];

  const failures = [];
  for (const [rel, needle, label] of checks) {
    if (!exists(rel) || !read(rel).includes(needle)) failures.push(`${label} (${rel})`);
  }

  const sqlMatches = listFilesRecursive(PATHS.migrationDir)
    .filter((rel) => rel.endsWith(".sql"))
    .filter((rel) => {
      try {
        const text = read(rel);
        return text.includes("excluded_from_norms") && text.includes("normative_exclusion_reason");
      } catch {
        return false;
      }
    });

  if (sqlMatches.length === 0) failures.push("migracja SQL z kolumnami wyłączenia");

  if (failures.length) {
    const message = "Weryfikacja NIE przeszła:\n- " + failures.join("\n- ");
    if (throwOnError) fail(message);
    return { ok: false, failures };
  }

  log("Weryfikacja statyczna: OK");
  log(`Migracja SQL: ${sqlMatches[sqlMatches.length - 1]}`);
  return { ok: true, failures: [] };
}

function fullVerify() {
  staticVerify();
  const diffCheck = spawnSync("git", ["diff", "--check"], { cwd: ROOT, stdio: "inherit" });
  if (diffCheck.status !== 0) fail("git diff --check wykrył problemy whitespace.");

  if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
    log("node_modules nie istnieje — pomijam db:check i TypeScript. Uruchom npm install, a potem verify --full.");
    return;
  }

  const env = {
    ...process.env,
    CONTROL_DATABASE_URL:
      process.env.CONTROL_DATABASE_URL ||
      "postgres://drizzle:drizzle@127.0.0.1:1/drizzle",
  };

  log("\nDrizzle migration check...");
  run("npm", ["run", "db:check"], { env });

  log("\nTypeScript check...");
  run("npx", ["--no-install", "tsc", "--noEmit"], { env });

  log("\nPełna weryfikacja: OK");
}

function rollbackInMemory(backup, { full = true } = {}) {
  for (const rel of CODE_BACKUP_PATHS) restoreBackupFile(backup.dir, rel);
  for (const rel of backup.manifest.createdFiles || []) {
    if (exists(rel)) fs.rmSync(abs(rel), { force: true });
  }

  if (full) {
    restoreBackupFile(backup.dir, PATHS.schema);
    restoreBackupFile(backup.dir, PATHS.journal);
    for (const rel of backup.manifest.generatedMigrationFiles || []) {
      if (exists(rel)) fs.rmSync(abs(rel), { force: true });
    }
  }
}

function repairInstalledV1({ force = false } = {}) {
  ensurePathClean(PATHS.csvTest, force);
  const backup = createBackup();
  log(`Backup naprawczy: ${path.relative(ROOT, backup.dir)}`);

  try {
    patchCsvTest();
    for (const rel of FULL_BACKUP_PATHS) {
      backup.manifest.postHashes[rel] = sha256File(rel);
    }
    saveManifest(backup);
    staticVerify();

    log("\nNaprawa v1.1 zakończona poprawnie.");
    log("Nie wygenerowano nowej migracji — istniejąca migracja 0030 pozostaje bez zmian.");
    log("Uruchom teraz: node install-values-normative-exclusion-v1.1.mjs verify --full");
  } catch (error) {
    log("\nBłąd podczas naprawy — przywracam test do stanu sprzed naprawy...");
    restoreBackupFile(backup.dir, PATHS.csvTest);
    saveManifest(backup);
    throw error;
  }
}

function apply({ force = false } = {}) {
  validateRepo();

  if (isInstalled()) {
    log("Funkcja v1.1 jest już zainstalowana. Uruchamiam weryfikację...");
    staticVerify();
    return;
  }

  if (isCoreInstalled()) {
    log("Wykryto instalację v1 bez aktualizacji testu CSV. Naprawiam tylko kontrakt testowy; migracja nie będzie generowana.");
    repairInstalledV1({ force });
    return;
  }

  ensureTargetFilesClean(force);
  const backup = createBackup();
  log(`Backup: ${path.relative(ROOT, backup.dir)}`);

  try {
    patchSchema();
    patchTypes();
    patchCsvTest();
    patchQueries();
    patchPage();
    patchList();
    patchDetail();
    createNewFiles(backup);
    generateMigration(backup);

    for (const rel of [
      ...FULL_BACKUP_PATHS,
      PATHS.action,
      PATHS.control,
      ...(backup.manifest.generatedMigrationFiles || []),
    ]) {
      backup.manifest.postHashes[rel] = sha256File(rel);
    }
    saveManifest(backup);

    staticVerify();

    log("\nInstalacja zakończona poprawnie.");
    log("UWAGA: migracja bazy NIE została wykonana.");
    log("1) przejrzyj git diff");
    log("2) uruchom: node install-values-normative-exclusion-v1.1.mjs verify --full");
    log("3) po akceptacji uruchom kontrolowaną migrację control DB: npm run db:migrate");
  } catch (error) {
    log("\nBłąd podczas instalacji — przywracam pliki do stanu sprzed apply...");
    rollbackInMemory(backup, { full: true });
    saveManifest(backup);
    throw error;
  }
}

function latestBackupDir() {
  if (!fs.existsSync(BACKUP_ROOT)) return null;
  const dirs = fs
    .readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(BACKUP_ROOT, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, "manifest.json")))
    .sort();
  return dirs.at(-1) ?? null;
}

function rollback({ full = false, force = false } = {}) {
  validateRepo();
  const dir = latestBackupDir();
  if (!dir) fail(`Nie znaleziono backupu w ${path.relative(ROOT, BACKUP_ROOT)}.`);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));

  const pathsToRestore = full
    ? [...FULL_BACKUP_PATHS, ...(manifest.createdFiles || []), ...(manifest.generatedMigrationFiles || [])]
    : [...CODE_BACKUP_PATHS, ...(manifest.createdFiles || [])];

  const changedAfterInstall = [];
  for (const rel of pathsToRestore) {
    const expected = manifest.postHashes?.[rel];
    if (!expected) continue;
    const current = sha256File(rel);
    if (current !== expected) changedAfterInstall.push(rel);
  }

  if (changedAfterInstall.length && !force) {
    fail(
      "Po instalacji zmieniły się pliki objęte rollbackiem:\n- " +
      changedAfterInstall.join("\n- ") +
      "\nRollback przerwany, aby nie nadpisać późniejszej pracy. Użyj --force tylko po świadomej ocenie.",
    );
  }

  rollbackInMemory({ dir, manifest }, { full });

  if (full) {
    log("Pełny rollback plików wykonany (kod + schema + wygenerowana migracja). Stosuj tylko, jeśli migracja DB nie została wcześniej wykonana.");
  } else {
    log("Bezpieczny rollback aplikacyjny wykonany. Schema i pliki migracji zostały pozostawione celowo.");
    log("Dzięki temu rollback jest bezpieczny także wtedy, gdy migracja control DB została już wykonana.");
  }
}

function check() {
  validateRepo();
  log("Repozytorium: cdziugiel/values / humanet-values — OK");
  log(`Stan funkcji: ${isInstalled() ? "zainstalowana" : "niezainstalowana"}`);
  const status = capture("git", ["status", "--porcelain", "--", PATHS.schema, PATHS.queries, PATHS.types, PATHS.list, PATHS.detail, PATHS.page, PATHS.csvTest, PATHS.migrationDir]);
  if (status) {
    log("\nLokalne zmiany w obszarze instalacji:");
    log(status);
  } else {
    log("Pliki docelowe są czyste względem Git — OK");
  }
}

const [command = "check", ...args] = process.argv.slice(2);
const force = args.includes("--force");
const full = args.includes("--full");

try {
  switch (command) {
    case "check":
      check();
      break;
    case "apply":
      apply({ force });
      break;
    case "verify":
      validateRepo();
      full ? fullVerify() : staticVerify();
      break;
    case "rollback":
      rollback({ full, force });
      break;
    default:
      fail(`Nieznane polecenie: ${command}\nDozwolone: check, apply, verify [--full], rollback [--full] [--force]`);
  }
} catch (error) {
  console.error(`\n[${INSTALLER_ID}] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
