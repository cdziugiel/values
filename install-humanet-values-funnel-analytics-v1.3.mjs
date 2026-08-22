#!/usr/bin/env node
/**
 * HUMANET VALUES — GA4 server cookie identity v1.3
 *
 * Final hardening for server-side funnel analytics.
 * The server reads GA4 client/session identity directly from standard first-party
 * GA cookies (_ga and _ga_<measurement suffix>) instead of requiring the helper
 * humanet_ga_identity_v1 cookie created by client JavaScript.
 *
 * Changes ONLY:
 * - features/analytics/server/read-analytics-identity.ts
 *
 * Does NOT change DB schema, scoring, responses, consent semantics, authentication,
 * purchases, payment processing, purchase intents, report access, or report rendering.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const INSTALLER_ID = "humanet-values-funnel-analytics-v1.3";
const MARKER = "@humanet-ga4-server-cookie-identity-v1.3";
const ROOT = process.cwd();
const TARGET = "features/analytics/server/read-analytics-identity.ts";
const FUNNEL_HELPER = "features/analytics/server/assessment-funnel.analytics.ts";
const BACKUP_ROOT = path.join(ROOT, ".humanet-installer-backups", INSTALLER_ID);
const LATEST_FILE = path.join(BACKUP_ROOT, "LATEST.json");
const EXPECTED_BEFORE = "2b88c0efde29bc5cea6444f2d535fbdb6ace7f5fe6e56015c0c4c691604e6cb0";
const EXPECTED_AFTER = "0ee84f7bfcb7b4aae13bf00fe554ee0088030d034791030d6591f863b02cb5e1";
const NEW_CONTENT = "// @humanet-ga4-mp-v1\n// @humanet-ga4-server-cookie-identity-v1.3\nimport \"server-only\";\n\nimport { cookies } from \"next/headers\";\n\nimport { parseAnalyticsIdentity } from \"../lib/analytics-identity\";\nimport type { AnalyticsIdentity } from \"../types/analytics-identity.types\";\n\nconst CUSTOM_IDENTITY_COOKIE_NAME = \"humanet_ga_identity_v1\";\nconst GA_CLIENT_COOKIE_NAME = \"_ga\";\n\nfunction safeDecode(value: string): string {\n  try {\n    return decodeURIComponent(value);\n  } catch {\n    return value;\n  }\n}\n\nfunction parseGaClientId(value: string | null | undefined): string | null {\n  if (!value) return null;\n\n  const parts = safeDecode(value).split(\".\");\n  if (parts.length < 2) return null;\n\n  const high = parts.at(-2) ?? \"\";\n  const low = parts.at(-1) ?? \"\";\n\n  if (!/^\\d+$/.test(high) || !/^\\d+$/.test(low)) return null;\n\n  const clientId = `${high}.${low}`;\n  return clientId.length <= 100 ? clientId : null;\n}\n\nfunction parseGaSessionId(value: string | null | undefined): string | null {\n  if (!value) return null;\n\n  const normalized = safeDecode(value);\n\n  // Current GA4 cookie format, e.g. GS2.1.s1787418190$o1$g1$t...\n  const gs2 = normalized.match(/(?:^|[.$])s(\\d+)(?=[$.]|$)/);\n  if (gs2?.[1]) return gs2[1];\n\n  // Older GA4 cookie format, e.g. GS1.1.1787418190.1.1....\n  const gs1 = normalized.match(/^GS\\d+\\.\\d+\\.(\\d+)/);\n  if (gs1?.[1]) return gs1[1];\n\n  return null;\n}\n\nfunction gaSessionCookieName(measurementId: string | null | undefined): string | null {\n  const normalized = measurementId?.trim();\n  if (!normalized) return null;\n\n  const suffix = normalized\n    .replace(/^G-/i, \"\")\n    .replace(/[^A-Za-z0-9]/g, \"\")\n    .toUpperCase();\n\n  return suffix ? `_ga_${suffix}` : null;\n}\n\nfunction parseCustomIdentity(raw: string | null | undefined): AnalyticsIdentity | null {\n  if (!raw) return null;\n\n  try {\n    return parseAnalyticsIdentity(JSON.parse(safeDecode(raw)) as unknown);\n  } catch {\n    return null;\n  }\n}\n\nexport async function readAnalyticsIdentityFromRequest(): Promise<AnalyticsIdentity | null> {\n  const store = await cookies();\n\n  /**\n   * Source of truth for server-side GA4 events is the standard first-party GA cookie.\n   * This removes the production dependency on a client-side helper cookie and works\n   * when GA4 is loaded through GTM, where gtag(\"get\", ...) may not return identity.\n   */\n  const clientId = parseGaClientId(store.get(GA_CLIENT_COOKIE_NAME)?.value);\n\n  if (clientId) {\n    const configuredSessionCookieName = gaSessionCookieName(\n      process.env.GA4_MEASUREMENT_ID,\n    );\n\n    let sessionCookieValue = configuredSessionCookieName\n      ? store.get(configuredSessionCookieName)?.value ?? null\n      : null;\n\n    if (!sessionCookieValue) {\n      const candidates = store\n        .getAll()\n        .filter((cookie) => /^_ga_[A-Za-z0-9]+$/.test(cookie.name));\n\n      // If there is only one GA4 stream cookie on the domain, it is unambiguous.\n      if (candidates.length === 1) {\n        sessionCookieValue = candidates[0]?.value ?? null;\n      }\n    }\n\n    return {\n      clientId,\n      sessionId: parseGaSessionId(sessionCookieValue),\n      capturedAt: new Date().toISOString(),\n    };\n  }\n\n  // Backward-compatible fallback for sessions that already have the helper cookie.\n  return parseCustomIdentity(store.get(CUSTOM_IDENTITY_COOKIE_NAME)?.value);\n}\n";

function abs(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) { return fs.readFileSync(abs(rel), "utf8"); }
function write(rel, content) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), content, "utf8");
}
function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function assertRepo() {
  if (!exists("package.json")) {
    throw new Error("Uruchom instalator z katalogu głównego repozytorium values (brak package.json).");
  }
  if (!exists(TARGET)) {
    throw new Error(`Brakuje ${TARGET}.`);
  }
  if (!exists(FUNNEL_HELPER) || !read(FUNNEL_HELPER).includes("@humanet-funnel-analytics-v1")) {
    throw new Error("Nie wykryto bazowej warstwy Funnel Analytics. Najpierw musi być zainstalowana analityka lejka.");
  }
}

function isInstalled() {
  return exists(TARGET) && read(TARGET).includes(MARKER);
}

function assertExpectedVersion() {
  const content = read(TARGET);
  if (content.includes(MARKER)) return;
  const actual = sha256(content);
  if (actual !== EXPECTED_BEFORE) {
    throw new Error(
      `${TARGET} różni się od przeanalizowanej wersji wejściowej v1.3. ` +
      `Oczekiwano SHA-256 ${EXPECTED_BEFORE}, otrzymano ${actual}. ` +
      "Przerywam bez zmian, aby nie nadpisać nowszego/lokalnego kodu.",
    );
  }
}

function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(BACKUP_ROOT, stamp);
  fs.mkdirSync(path.join(dir, "files", path.dirname(TARGET)), { recursive: true });
  fs.copyFileSync(abs(TARGET), path.join(dir, "files", TARGET));
  const manifest = {
    installerId: INSTALLER_ID,
    createdAt: new Date().toISOString(),
    root: ROOT,
    files: [{ path: TARGET, existed: true, sha256Before: sha256(read(TARGET)) }],
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  fs.writeFileSync(LATEST_FILE, JSON.stringify({ backupDir: dir, createdAt: manifest.createdAt }, null, 2) + "\n");
  return dir;
}

function rollback() {
  if (!fs.existsSync(LATEST_FILE)) throw new Error("Brak backupu v1.3 do rollbacku.");
  const latest = JSON.parse(fs.readFileSync(LATEST_FILE, "utf8"));
  const dir = latest.backupDir;
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  if (manifest.installerId !== INSTALLER_ID) throw new Error("Nieprawidłowy backup v1.3.");
  fs.copyFileSync(path.join(dir, "files", TARGET), abs(TARGET));
  console.log(`ROLLBACK OK: ${dir}`);
}

function verify() {
  assertRepo();
  const content = read(TARGET);
  const required = [
    MARKER,
    'const GA_CLIENT_COOKIE_NAME = "_ga"',
    "parseGaClientId",
    "parseGaSessionId",
    "process.env.GA4_MEASUREMENT_ID",
    ".getAll()",
    "Backward-compatible fallback",
  ];
  const errors = required.filter((needle) => !content.includes(needle));
  if (sha256(content) !== EXPECTED_AFTER) errors.push("SHA-256 po instalacji nie odpowiada paczce v1.3");
  if (errors.length) {
    console.error("VERIFY FAIL");
    for (const error of errors) console.error(` - ${error}`);
    return false;
  }
  console.log("VERIFY PASS — server-side GA4 identity reads standard GA cookies directly.");
  return true;
}

function run(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", shell: false });
  return result.status === 0;
}

function fullVerify() {
  if (!verify()) return false;
  if (!run("git", ["diff", "--check", "--", TARGET])) {
    console.error("FULL VERIFY FAIL: git diff --check");
    return false;
  }
  if (!run("pnpm", ["exec", "eslint", TARGET])) {
    console.error("FULL VERIFY FAIL: ESLint");
    return false;
  }
  if (!run("pnpm", ["exec", "tsc", "--noEmit"])) {
    console.error("FULL VERIFY FAIL: TypeScript");
    return false;
  }
  console.log("FULL VERIFY PASS — structure + diff check + ESLint + repository TypeScript.");
  return true;
}

function printPlan() {
  console.log(`Installer: ${INSTALLER_ID}`);
  console.log("Plan zmian:");
  console.log(` - MODIFY ${TARGET}`);
  console.log("Źródło identity dla server-side GA4 po zmianie:");
  console.log("  1) standardowe _ga + _ga_<measurement> (preferowane)");
  console.log("  2) humanet_ga_identity_v1 (fallback zgodności wstecznej)");
  console.log("NIE zmienia: DB, scoringu, odpowiedzi, consent semantics, auth, płatności ani raportów.\n");
}

function check() {
  assertRepo();
  if (isInstalled()) {
    if (!verify()) process.exit(1);
    console.log("CHECK PASS — v1.3 jest już zainstalowany.");
    return;
  }
  assertExpectedVersion();
  console.log("CHECK PASS — rozpoznano dokładnie wersję wejściową; brak zmian na dysku.");
}

function dryRun() {
  assertRepo();
  if (isInstalled()) { console.log("DRY RUN PASS — v1.3 jest już zainstalowany."); return; }
  assertExpectedVersion();
  console.log("DRY RUN PASS — jednoplikowy patch server-side może zostać bezpiecznie zastosowany; brak zmian na dysku.");
}

function install() {
  assertRepo();
  if (isInstalled()) {
    console.log("INSTALL: v1.3 jest już zainstalowany.");
    if (!verify()) process.exit(1);
    return;
  }
  assertExpectedVersion();
  const dir = backup();
  console.log(`Backup: ${dir}`);
  try {
    write(TARGET, NEW_CONTENT);
    if (!verify()) throw new Error("Weryfikacja po instalacji nie powiodła się.");
    console.log("INSTALL PASS");
    console.log("Następnie uruchom: node install-humanet-values-funnel-analytics-v1.3.mjs --full-verify");
    console.log("Po deployu usuń ręczne humanet_ga_identity_v1 i przetestuj QA — event ma działać z samych _ga cookies.");
  } catch (error) {
    fs.copyFileSync(path.join(dir, "files", TARGET), abs(TARGET));
    console.error("INSTALL FAIL — wykonano automatyczny rollback.");
    throw error;
  }
}

printPlan();
const mode = process.argv[2] || "--check";
try {
  if (mode === "--check") check();
  else if (mode === "--dry-run") dryRun();
  else if (mode === "--install") install();
  else if (mode === "--verify") { if (!verify()) process.exit(1); }
  else if (mode === "--full-verify") { if (!fullVerify()) process.exit(1); }
  else if (mode === "--rollback") rollback();
  else {
    console.error("Użycie: --check | --dry-run | --install | --verify | --full-verify | --rollback");
    process.exit(2);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
