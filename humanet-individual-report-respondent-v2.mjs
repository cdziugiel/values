#!/usr/bin/env node

/**
 * HUMANET VALUES
 * Production repair v2:
 * respondent metadata for individual report render context.
 *
 * Why v2:
 * - v1 enriched result.payload directly.
 * - result.payload is also consumed by CompletedAssessmentPayload,
 *   so widening/replacing its inferred shape broke TypeScript.
 *
 * v2 keeps snapshot payload untouched and exposes respondent as a sibling:
 *   result.payload     -> unchanged snapshot payload
 *   result.respondent  -> identity metadata for report rendering
 *
 * Only report preview + print merge respondent into the render payload.
 * PDF uses the print route, so no PDF route change is required.
 *
 * Commands:
 *   node humanet-individual-report-respondent-v2.mjs install
 *   node humanet-individual-report-respondent-v2.mjs verify
 *   node humanet-individual-report-respondent-v2.mjs verify --build
 *   node humanet-individual-report-respondent-v2.mjs rollback
 *
 * install automatically:
 * - repairs/removes the previous v1 patch if present,
 * - creates backups,
 * - applies v2,
 * - verifies structure,
 * - runs TypeScript,
 * - runs `npm run build` unless --skip-build is passed,
 * - rolls back to a clean baseline automatically if validation fails.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const PATCH_ID = "humanet-values-individual-report-respondent-v2";

const FILES = {
  query:
    "features/my-assessment/api/my-assessment-result.queries.ts",
  preview:
    "app/(protected)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/page.tsx",
  print:
    "app/(print)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/print/page.tsx",
  completed:
    "app/(protected)/my/assessment/sessions/[sessionId]/completed/page.tsx",
};

const V1 = {
  selectBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V1_SELECT_BEGIN",
  selectEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V1_SELECT_END",
  runtimeBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V1_RUNTIME_BEGIN",
  runtimeEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V1_RUNTIME_END",
  payloadBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V1_PAYLOAD_BEGIN",
  payloadEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V1_PAYLOAD_END",
};

const V2 = {
  selectBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_SELECT_BEGIN",
  selectEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_SELECT_END",
  identityBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_IDENTITY_BEGIN",
  identityEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_IDENTITY_END",
  emptyReturnBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_EMPTY_RETURN_BEGIN",
  emptyReturnEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_EMPTY_RETURN_END",
  finalReturnBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_FINAL_RETURN_BEGIN",
  finalReturnEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_FINAL_RETURN_END",
  previewBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_PREVIEW_CONTEXT_BEGIN",
  previewEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_PREVIEW_CONTEXT_END",
  printBegin:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_PRINT_CONTEXT_BEGIN",
  printEnd:
    "// HUMANET_PATCH_INDIVIDUAL_REPORT_RESPONDENT_V2_PRINT_CONTEXT_END",
};

function log(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function atomicWrite(file, content) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}

function findRoot(start = process.cwd()) {
  let current = path.resolve(start);

  while (true) {
    const pkg = path.join(current, "package.json");
    const query = path.join(current, FILES.query);

    if (fs.existsSync(pkg) && fs.existsSync(query)) {
      try {
        const parsed = JSON.parse(read(pkg));
        if (parsed?.name === "humanet-values") {
          return current;
        }
      } catch {
        // Continue upwards.
      }
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  fail(
    "Nie znaleziono repozytorium HUMANET VALUES (package.json name=humanet-values).",
  );
}

function abs(root, relative) {
  return path.join(root, relative);
}

function requireFiles(root) {
  for (const [name, relative] of Object.entries(FILES)) {
    const file = abs(root, relative);
    if (!fs.existsSync(file)) {
      fail(`Brak wymaganego pliku (${name}): ${relative}`);
    }
  }
}

function markersState(source, markers) {
  const values = Object.values(markers);
  const count = values.filter((marker) => source.includes(marker)).length;
  if (count === 0) return "none";
  if (count === values.length) return "all";
  return "partial";
}

function removeMarkedBlock(source, begin, end) {
  const beginIndex = source.indexOf(begin);
  if (beginIndex < 0) return source;

  const lineStart = source.lastIndexOf("\n", beginIndex) + 1;
  const endIndex = source.indexOf(end, beginIndex);

  if (endIndex < 0) {
    fail(`Brak końcowego markera: ${end}`);
  }

  const endLine = source.indexOf("\n", endIndex);
  const after =
    endLine < 0 ? source.length : endLine + 1;

  return source.slice(0, lineStart) + source.slice(after);
}

function replaceMarkedBlock(source, begin, end, replacement) {
  const beginIndex = source.indexOf(begin);
  if (beginIndex < 0) return source;

  const lineStart = source.lastIndexOf("\n", beginIndex) + 1;
  const endIndex = source.indexOf(end, beginIndex);

  if (endIndex < 0) {
    fail(`Brak końcowego markera: ${end}`);
  }

  const endLine = source.indexOf("\n", endIndex);
  const after =
    endLine < 0 ? source.length : endLine + 1;

  return (
    source.slice(0, lineStart) +
    replacement +
    source.slice(after)
  );
}

function cleanupV1(querySource) {
  const state = markersState(querySource, V1);

  if (state === "none") {
    return { source: querySource, repaired: false };
  }

  if (state === "partial") {
    fail(
      "W pliku query znaleziono częściową instalację v1. Automatyczna naprawa została zatrzymana, aby nie zgadywać stanu kodu.",
    );
  }

  let source = querySource;

  source = removeMarkedBlock(
    source,
    V1.selectBegin,
    V1.selectEnd,
  );

  source = removeMarkedBlock(
    source,
    V1.runtimeBegin,
    V1.runtimeEnd,
  );

  source = replaceMarkedBlock(
    source,
    V1.payloadBegin,
    V1.payloadEnd,
    "    payload: snapshot.payload as any,\n",
  );

  if (Object.values(V1).some((m) => source.includes(m))) {
    fail("Nie udało się całkowicie usunąć patcha v1.");
  }

  return { source, repaired: true };
}

function assertCleanBaseShape(query, preview, print, completed) {
  const queryNeedles = [
    "const ownershipRows = await tenant.db",
    "sessionStatus: assessmentSessions.status,",
    "respondentEmail: respondentIdentities.email,",
    'if (normalizeEmail(ownership.respondentEmail) !== email) {',
    "const snapshotRows = await tenant.db",
    "payload: snapshot.payload as any,",
  ];

  for (const needle of queryNeedles) {
    if (!query.includes(needle)) {
      fail(`Query nie ma oczekiwanego anchoru: ${needle}`);
    }
  }

  for (const [label, source] of [
    ["preview", preview],
    ["print", print],
  ]) {
    if (!source.includes("const rendered = renderReportDocument({")) {
      fail(`${label}: brak renderReportDocument().`);
    }
    if (!source.includes("payload: result.payload,")) {
      fail(`${label}: brak oczekiwanego payload: result.payload.`);
    }
  }

  if (!completed.includes("payload: result.payload,")) {
    fail(
      "completed/page.tsx nie ma oczekiwanego payload: result.payload. Patch nie będzie modyfikował tego pliku.",
    );
  }
}

function patchQuery(source) {
  if (
    Object.values(V2)
      .slice(0, 8)
      .some((marker) => source.includes(marker))
  ) {
    fail("Query zawiera już markery v2.");
  }

  const selectAnchor =
    "      respondentEmail: respondentIdentities.email,";

  const selectBlock = [
    `      ${V2.selectBegin}`,
    "      respondentId: respondents.id,",
    "      respondentExternalCode: respondents.externalCode,",
    "      respondentFirstName: respondentIdentities.firstName,",
    "      respondentLastName: respondentIdentities.lastName,",
    `      ${V2.selectEnd}`,
    "",
  ].join("\n");

  const selectIndex = source.indexOf(selectAnchor);
  if (selectIndex < 0) fail("Brak anchoru respondentEmail.");

  source =
    source.slice(0, selectIndex) +
    selectBlock +
    source.slice(selectIndex);

  const ownershipCheck = [
    '  if (normalizeEmail(ownership.respondentEmail) !== email) {',
    '    throw new Error("Ta sesja badania nie należy do zalogowanego użytkownika.");',
    "  }",
  ].join("\n");

  const ownershipIndex = source.indexOf(ownershipCheck);
  if (ownershipIndex < 0) {
    fail("Brak dokładnego anchoru kontroli ownership.");
  }

  const identityBlock = [
    "",
    `  ${V2.identityBegin}`,
    "  const respondentDisplayName =",
    "    [",
    "      ownership.respondentFirstName,",
    "      ownership.respondentLastName,",
    "    ]",
    "      .map((value) => value?.trim())",
    "      .filter(Boolean)",
    '      .join(" ") ||',
    "    ownership.respondentEmail?.trim() ||",
    "    ownership.respondentExternalCode?.trim() ||",
    '    "Respondent";',
    "",
    "  const respondent = {",
    "    id: ownership.respondentId,",
    "    displayName: respondentDisplayName,",
    "    email: ownership.respondentEmail ?? null,",
    "    externalCode: ownership.respondentExternalCode ?? null,",
    "  };",
    `  ${V2.identityEnd}`,
  ].join("\n");

  const afterOwnership = ownershipIndex + ownershipCheck.length;
  source =
    source.slice(0, afterOwnership) +
    identityBlock +
    source.slice(afterOwnership);

  const emptyNeedle = [
    "      questionnaireVersionId: null,",
    "",
    "      snapshot: null,",
    "      payload: null,",
  ].join("\n");

  const emptyReplacement = [
    "      questionnaireVersionId: null,",
    "",
    `      ${V2.emptyReturnBegin}`,
    "      respondent,",
    `      ${V2.emptyReturnEnd}`,
    "",
    "      snapshot: null,",
    "      payload: null,",
  ].join("\n");

  if (!source.includes(emptyNeedle)) {
    fail("Brak anchoru return dla pustego snapshotu.");
  }
  source = source.replace(emptyNeedle, emptyReplacement);

  const finalNeedle = [
    "    questionnaireVersionId:",
    "      snapshot.questionnaireVersionId ?? null,",
    "",
    "    snapshot,",
    "    payload: snapshot.payload as any,",
  ].join("\n");

  const finalReplacement = [
    "    questionnaireVersionId:",
    "      snapshot.questionnaireVersionId ?? null,",
    "",
    `    ${V2.finalReturnBegin}`,
    "    respondent,",
    `    ${V2.finalReturnEnd}`,
    "",
    "    snapshot,",
    "    payload: snapshot.payload as any,",
  ].join("\n");

  if (!source.includes(finalNeedle)) {
    fail("Brak anchoru końcowego return.");
  }

  return source.replace(finalNeedle, finalReplacement);
}

function patchRenderPage(source, kind) {
  const markerBegin =
    kind === "preview" ? V2.previewBegin : V2.printBegin;
  const markerEnd =
    kind === "preview" ? V2.previewEnd : V2.printEnd;

  if (source.includes(markerBegin) || source.includes(markerEnd)) {
    fail(`${kind}: markery v2 są już obecne.`);
  }

  const renderedAnchor =
    "  const rendered = renderReportDocument({";

  const index = source.indexOf(renderedAnchor);
  if (index < 0) {
    fail(`${kind}: brak anchoru renderReportDocument.`);
  }

  const block = [
    `  ${markerBegin}`,
    "  const reportPayload = {",
    "    ...(result.payload as Record<string, unknown>),",
    "    respondent: result.respondent,",
    "  };",
    `  ${markerEnd}`,
    "",
  ].join("\n");

  source =
    source.slice(0, index) +
    block +
    source.slice(index);

  const payloadNeedle = "    payload: result.payload,";
  const payloadIndex = source.indexOf(payloadNeedle, index);

  if (payloadIndex < 0) {
    fail(`${kind}: brak payload: result.payload w rendererze.`);
  }

  source =
    source.slice(0, payloadIndex) +
    "    payload: reportPayload," +
    source.slice(payloadIndex + payloadNeedle.length);

  return source;
}

function verifyStatic(root) {
  requireFiles(root);

  const query = read(abs(root, FILES.query));
  const preview = read(abs(root, FILES.preview));
  const print = read(abs(root, FILES.print));
  const completed = read(abs(root, FILES.completed));

  if (Object.values(V1).some((m) => query.includes(m))) {
    fail("Verify: pozostały markery v1.");
  }

  const queryRequired = [
    V2.selectBegin,
    V2.selectEnd,
    V2.identityBegin,
    V2.identityEnd,
    V2.emptyReturnBegin,
    V2.emptyReturnEnd,
    V2.finalReturnBegin,
    V2.finalReturnEnd,
    "respondentId: respondents.id,",
    "respondentExternalCode: respondents.externalCode,",
    "respondentFirstName: respondentIdentities.firstName,",
    "respondentLastName: respondentIdentities.lastName,",
    "const respondent = {",
    "payload: snapshot.payload as any,",
  ];

  for (const needle of queryRequired) {
    if (!query.includes(needle)) {
      fail(`Verify query: brakuje ${needle}`);
    }
  }

  // Kluczowy warunek bezpieczeństwa: snapshot payload pozostaje payloadem.
  if (query.includes(`${V1.payloadBegin}`)) {
    fail("Verify: wykryto stary v1 payload enrichment.");
  }

  for (const [kind, source, begin, end] of [
    ["preview", preview, V2.previewBegin, V2.previewEnd],
    ["print", print, V2.printBegin, V2.printEnd],
  ]) {
    for (const needle of [
      begin,
      end,
      "const reportPayload = {",
      "...(result.payload as Record<string, unknown>),",
      "respondent: result.respondent,",
      "payload: reportPayload,",
    ]) {
      if (!source.includes(needle)) {
        fail(`Verify ${kind}: brakuje ${needle}`);
      }
    }
  }

  // Completed view ma nadal dostać surowy/oryginalny snapshot payload.
  if (!completed.includes("payload: result.payload,")) {
    fail(
      "Verify completed: result.payload nie jest przekazywany bezpośrednio.",
    );
  }

  if (
    completed.includes(V2.previewBegin) ||
    completed.includes(V2.printBegin)
  ) {
    fail("Verify completed: plik został nieoczekiwanie zmodyfikowany.");
  }

  log(
    "OK",
    "Static verify: payload snapshotu jest nietknięty; respondent jest dodawany tylko do render context raportu.",
  );
}

function run(command, args, cwd) {
  log("RUN", `${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    fail(`${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${command} zakończył się kodem ${result.status}.`);
  }
}

function runTypecheck(root) {
  run("npm", ["exec", "tsc", "--", "--noEmit"], root);
  log("OK", "TypeScript: OK");
}

function runBuild(root) {
  run("npm", ["run", "build"], root);
  log("OK", "Next.js production build: OK");
}

function backupDir(root) {
  return path.join(root, ".humanet-patches", PATCH_ID);
}

function safeBackupName(relative) {
  return relative.replaceAll("/", "__");
}

function saveBackupSet(root, dir, sources) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [key, relative] of Object.entries({
    query: FILES.query,
    preview: FILES.preview,
    print: FILES.print,
  })) {
    fs.writeFileSync(
      path.join(dir, safeBackupName(relative)),
      sources[key],
      "utf8",
    );
  }
}

function restoreBackupSet(root, dir) {
  for (const relative of [
    FILES.query,
    FILES.preview,
    FILES.print,
  ]) {
    const backup = path.join(dir, safeBackupName(relative));
    if (!fs.existsSync(backup)) {
      fail(`Brak backupu: ${backup}`);
    }
    atomicWrite(abs(root, relative), read(backup));
  }
}

function currentSources(root) {
  return {
    query: read(abs(root, FILES.query)),
    preview: read(abs(root, FILES.preview)),
    print: read(abs(root, FILES.print)),
  };
}

function hasV2Installed(root) {
  const sources = currentSources(root);
  return (
    sources.query.includes(V2.identityBegin) &&
    sources.preview.includes(V2.previewBegin) &&
    sources.print.includes(V2.printBegin)
  );
}

function rollbackSurgical(root) {
  let query = read(abs(root, FILES.query));
  let preview = read(abs(root, FILES.preview));
  let print = read(abs(root, FILES.print));

  if (markersState(query, {
    a: V2.selectBegin,
    b: V2.selectEnd,
    c: V2.identityBegin,
    d: V2.identityEnd,
    e: V2.emptyReturnBegin,
    f: V2.emptyReturnEnd,
    g: V2.finalReturnBegin,
    h: V2.finalReturnEnd,
  }) === "partial") {
    fail("Rollback: query zawiera częściowy v2.");
  }

  query = removeMarkedBlock(query, V2.selectBegin, V2.selectEnd);
  query = removeMarkedBlock(query, V2.identityBegin, V2.identityEnd);
  query = removeMarkedBlock(
    query,
    V2.emptyReturnBegin,
    V2.emptyReturnEnd,
  );
  query = removeMarkedBlock(
    query,
    V2.finalReturnBegin,
    V2.finalReturnEnd,
  );

  for (const [kind, sourceValue, begin, end] of [
    ["preview", preview, V2.previewBegin, V2.previewEnd],
    ["print", print, V2.printBegin, V2.printEnd],
  ]) {
    let source = removeMarkedBlock(sourceValue, begin, end);

    const count =
      source.split("    payload: reportPayload,").length - 1;

    if (count !== 1) {
      fail(
        `Rollback ${kind}: oczekiwano jednego payload: reportPayload, znaleziono ${count}.`,
      );
    }

    source = source.replace(
      "    payload: reportPayload,",
      "    payload: result.payload,",
    );

    if (kind === "preview") preview = source;
    else print = source;
  }

  atomicWrite(abs(root, FILES.query), query);
  atomicWrite(abs(root, FILES.preview), preview);
  atomicWrite(abs(root, FILES.print), print);

  log("OK", "Rollback v2 wykonany chirurgicznie.");
}

function install(root, { skipBuild = false } = {}) {
  requireFiles(root);

  if (hasV2Installed(root)) {
    log("INFO", "Patch v2 jest już zainstalowany.");
    verifyStatic(root);
    runTypecheck(root);
    if (!skipBuild) runBuild(root);
    return;
  }

  const raw = currentSources(root);

  const queryV2Any = Object.values(V2)
    .slice(0, 8)
    .some((m) => raw.query.includes(m));

  if (queryV2Any) {
    fail(
      "Wykryto częściową lub ręcznie zmienioną instalację v2. Przerywam.",
    );
  }

  const cleaned = cleanupV1(raw.query);

  const baseline = {
    query: cleaned.source,
    preview: raw.preview,
    print: raw.print,
  };

  assertCleanBaseShape(
    baseline.query,
    baseline.preview,
    baseline.print,
    read(abs(root, FILES.completed)),
  );

  const patchDir = backupDir(root);
  const preRepairDir = path.join(patchDir, "pre-repair");
  const baselineDir = path.join(patchDir, "baseline");

  fs.mkdirSync(patchDir, { recursive: true });
  saveBackupSet(root, preRepairDir, raw);
  saveBackupSet(root, baselineDir, baseline);

  const patched = {
    query: patchQuery(baseline.query),
    preview: patchRenderPage(baseline.preview, "preview"),
    print: patchRenderPage(baseline.print, "print"),
  };

  const manifest = {
    patchId: PATCH_ID,
    createdAt: new Date().toISOString(),
    repairedV1: cleaned.repaired,
    baselineSha256: Object.fromEntries(
      Object.entries(baseline).map(([k, v]) => [k, sha256(v)]),
    ),
    patchedSha256: Object.fromEntries(
      Object.entries(patched).map(([k, v]) => [k, sha256(v)]),
    ),
  };

  fs.writeFileSync(
    path.join(patchDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  try {
    atomicWrite(abs(root, FILES.query), patched.query);
    atomicWrite(abs(root, FILES.preview), patched.preview);
    atomicWrite(abs(root, FILES.print), patched.print);

    verifyStatic(root);
    runTypecheck(root);

    if (!skipBuild) {
      runBuild(root);
    }

    log(
      "OK",
      cleaned.repaired
        ? "Naprawiono v1 i zainstalowano v2."
        : "Zainstalowano v2.",
    );
  } catch (error) {
    console.error("\n[ERROR] Walidacja instalacji nie powiodła się.");
    console.error(error instanceof Error ? error.message : error);
    console.error(
      "[INFO] Automatycznie przywracam CZYSTY baseline bez v1/v2...",
    );

    restoreBackupSet(root, baselineDir);
    console.error("[OK] Przywrócono baseline.");
    process.exit(1);
  }
}

function verify(root, { build = false } = {}) {
  verifyStatic(root);
  runTypecheck(root);
  if (build) runBuild(root);
}

function rollback(root) {
  requireFiles(root);

  if (!hasV2Installed(root)) {
    const query = read(abs(root, FILES.query));

    if (Object.values(V1).some((m) => query.includes(m))) {
      const cleaned = cleanupV1(query);
      atomicWrite(abs(root, FILES.query), cleaned.source);
      log("OK", "Usunięto pozostałości starego patcha v1.");
      return;
    }

    log("INFO", "v2 nie jest zainstalowany.");
    return;
  }

  const dir = backupDir(root);
  const manifestPath = path.join(dir, "manifest.json");
  const baselineDir = path.join(dir, "baseline");

  if (
    fs.existsSync(manifestPath) &&
    fs.existsSync(baselineDir)
  ) {
    try {
      const manifest = JSON.parse(read(manifestPath));
      const current = currentSources(root);

      const unchangedSinceInstall = Object.entries(current).every(
        ([key, value]) =>
          manifest?.patchedSha256?.[key] === sha256(value),
      );

      if (unchangedSinceInstall) {
        restoreBackupSet(root, baselineDir);
        log(
          "OK",
          "Rollback: przywrócono dokładny baseline sprzed v2 (bez starego v1).",
        );
        return;
      }
    } catch {
      // Fall through to surgical rollback.
    }
  }

  log(
    "INFO",
    "Pliki zmieniły się po instalacji; wykonuję chirurgiczny rollback markerów v2.",
  );
  rollbackSurgical(root);
}

function help() {
  console.log(`
HUMANET VALUES — individual report respondent repair v2

install
  Naprawia poprzedni patch v1 (jeżeli istnieje), instaluje v2,
  uruchamia TypeScript i domyślnie pełny npm run build.

verify
  Sprawdza strukturę patcha i uruchamia TypeScript.

verify --build
  Jak wyżej + pełny npm run build.

rollback
  Cofa wyłącznie patch respondent metadata.
  Jeżeli pliki nie były później zmieniane, przywraca dokładny baseline.
  W przeciwnym razie wykonuje chirurgiczny rollback markerów.

Opcja:
  --skip-build
    Tylko dla install: pomija pełny Next.js build.
    TypeScript nadal jest obowiązkowy.

Przykłady:
  node humanet-individual-report-respondent-v2.mjs install
  node humanet-individual-report-respondent-v2.mjs verify
  node humanet-individual-report-respondent-v2.mjs verify --build
  node humanet-individual-report-respondent-v2.mjs rollback
`);
}

const root = findRoot();
const command = process.argv[2] ?? "install";

try {
  switch (command) {
    case "install":
      install(root, {
        skipBuild: process.argv.includes("--skip-build"),
      });
      break;

    case "verify":
      verify(root, {
        build: process.argv.includes("--build"),
      });
      break;

    case "rollback":
      rollback(root);
      break;

    case "help":
    case "--help":
    case "-h":
      help();
      break;

    default:
      help();
      fail(`Nieznane polecenie: ${command}`);
  }
} catch (error) {
  console.error(
    `\n[ERROR] ${error instanceof Error ? error.message : error}\n`,
  );
  process.exit(1);
}
