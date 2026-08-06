#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";

const PATCH_ID = "partner-dashboard-readable-activity-v2";
const TARGET = "app/(protected)/t/[tenantSlug]/dashboard/page.tsx";
const BACKUP_ROOT = ".humanet-installer-backups";

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const isRollback = args.has("--rollback");
const isFullVerification = args.has("--full");
const skipCommands = args.has("--skip-commands");

function log(message) {
  console.log(`[${PATCH_ID}] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) {
    fail(`Nie znaleziono oczekiwanego fragmentu: ${label}. Kod mógł się zmienić.`);
  }

  const second = source.indexOf(before, first + before.length);
  if (second >= 0) {
    fail(`Fragment występuje więcej niż raz: ${label}. Instalacja została przerwana.`);
  }

  return source.slice(0, first) + after + source.slice(first + before.length);
}

function ensureProjectRoot(root) {
  const packagePath = join(root, "package.json");
  const targetPath = join(root, TARGET);

  if (!existsSync(packagePath)) {
    fail("Uruchom instalator w katalogu głównym repozytorium HUMANET VALUES.");
  }

  const pkg = readJson(packagePath);
  if (pkg.name !== "humanet-values") {
    fail(`Nieoczekiwany projekt: package.json name=${JSON.stringify(pkg.name)}.`);
  }

  if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
    fail(`Brak pliku docelowego: ${TARGET}`);
  }

  return targetPath;
}

function makeBackup(root, targetPath, original) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(root, BACKUP_ROOT, `${PATCH_ID}-${stamp}`);
  const backupFile = join(backupDir, TARGET);

  mkdirSync(dirname(backupFile), { recursive: true });
  writeFileSync(backupFile, original, "utf8");
  writeFileSync(
    join(backupDir, "manifest.json"),
    JSON.stringify(
      {
        patchId: PATCH_ID,
        target: TARGET,
        createdAt: new Date().toISOString(),
        originalSha256: sha256(original),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  return backupDir;
}

function listBackups(root) {
  const directory = join(root, BACKUP_ROOT);
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .filter((name) => name.startsWith(`${PATCH_ID}-`))
    .map((name) => join(directory, name))
    .filter((path) => statSync(path).isDirectory())
    .sort()
    .reverse();
}

function rollback(root, targetPath) {
  const backups = listBackups(root);
  if (backups.length === 0) {
    fail(`Nie znaleziono backupu dla ${PATCH_ID}.`);
  }

  const backupDir = backups[0];
  const backupFile = join(backupDir, TARGET);
  const manifestFile = join(backupDir, "manifest.json");

  if (!existsSync(backupFile) || !existsSync(manifestFile)) {
    fail(`Backup jest niekompletny: ${backupDir}`);
  }

  const manifest = readJson(manifestFile);
  const backupContent = readFileSync(backupFile, "utf8");

  if (sha256(backupContent) !== manifest.originalSha256) {
    fail(`Suma kontrolna backupu jest nieprawidłowa: ${backupDir}`);
  }

  cpSync(backupFile, targetPath);

  const restored = readFileSync(targetPath, "utf8");
  if (sha256(restored) !== manifest.originalSha256) {
    fail("Rollback nie przywrócił oczekiwanej wersji pliku.");
  }

  log(`Przywrócono ${TARGET} z ${backupDir}.`);
}

function patchDashboard(original) {
  if (
    original.includes("respondentEmail: respondentIdentities.email") &&
    original.includes("buyerEmail: users.email") &&
    original.includes("questionnaireNames:")
  ) {
    log("Zmiana jest już zainstalowana. Nie wykonano ponownej modyfikacji.");
    return { content: original, alreadyInstalled: true };
  }

  let content = original;

  content = replaceExactlyOnce(
    content,
    `import {\n  and,\n  count,\n  desc,\n  eq,\n  gte,\n  isNull,\n  lt,\n  sql,\n} from "drizzle-orm";`,
    `import {\n  and,\n  count,\n  desc,\n  eq,\n  gte,\n  inArray,\n  isNull,\n  lt,\n  sql,\n} from "drizzle-orm";`,
    "import drizzle-orm",
  );

  content = replaceExactlyOnce(
    content,
    `import {\n  assessmentProjects,\n  assessmentResultSnapshots,\n  assessmentSessions,\n  respondents,\n} from "@/drizzle/schema/tenant-schema";`,
    `import {\n  assessmentProjectQuestionnaires,\n  assessmentProjects,\n  assessmentResultSnapshots,\n  assessmentSessions,\n  respondentIdentities,\n  respondents,\n} from "@/drizzle/schema/tenant-schema";`,
    "import tenant schema",
  );

  content = replaceExactlyOnce(
    content,
    `import { reportAccessCodes, reportAccessOrders } from "@/drizzle/schema";`,
    `import {\n  questionnaires,\n  questionnaireVersions,\n  reportAccessCodes,\n  reportAccessOrders,\n  users,\n} from "@/drizzle/schema";`,
    "import control/shared schema",
  );

  content = replaceExactlyOnce(
    content,
    `    db\n      .select({\n        id: assessmentSessions.id,\n        status: assessmentSessions.status,\n        assessmentProjectId: assessmentSessions.assessmentProjectId,\n        completedAt: assessmentSessions.completedAt,\n        updatedAt: assessmentSessions.updatedAt,\n      })\n      .from(assessmentSessions)\n      .where(isNull(assessmentSessions.deletedAt))\n      .orderBy(desc(assessmentSessions.updatedAt))\n      .limit(8),`,
    `    db\n      .select({\n        id: assessmentSessions.id,\n        status: assessmentSessions.status,\n        assessmentProjectId: assessmentSessions.assessmentProjectId,\n        respondentEmail: respondentIdentities.email,\n        completedAt: assessmentSessions.completedAt,\n        updatedAt: assessmentSessions.updatedAt,\n      })\n      .from(assessmentSessions)\n      .leftJoin(\n        respondentIdentities,\n        and(\n          eq(respondentIdentities.respondentId, assessmentSessions.respondentId),\n          isNull(respondentIdentities.deletedAt),\n        ),\n      )\n      .where(isNull(assessmentSessions.deletedAt))\n      .orderBy(desc(assessmentSessions.updatedAt))\n      .limit(8),`,
    "zapytanie ostatnich sesji",
  );

  content = replaceExactlyOnce(
    content,
    `    controlDb\n      .select({\n        id: reportAccessOrders.id,\n        status: reportAccessOrders.status,\n        currency: reportAccessOrders.currency,\n        totalGross: reportAccessOrders.totalGross,\n        paymentProvider: reportAccessOrders.paymentProvider,\n        paidAt: reportAccessOrders.paidAt,\n        createdAt: reportAccessOrders.createdAt,\n      })\n      .from(reportAccessOrders)\n      .where(`,
    `    controlDb\n      .select({\n        id: reportAccessOrders.id,\n        status: reportAccessOrders.status,\n        buyerEmail: users.email,\n        currency: reportAccessOrders.currency,\n        totalGross: reportAccessOrders.totalGross,\n        paymentProvider: reportAccessOrders.paymentProvider,\n        paidAt: reportAccessOrders.paidAt,\n        createdAt: reportAccessOrders.createdAt,\n      })\n      .from(reportAccessOrders)\n      .leftJoin(\n        users,\n        and(\n          eq(users.id, reportAccessOrders.buyerUserId),\n          isNull(users.deletedAt),\n        ),\n      )\n      .where(`,
    "zapytanie ostatnich zakupów",
  );

  content = replaceExactlyOnce(
    content,
    `  const sessionStatus = {\n    notStarted: 0,`,
    `  const recentSessionProjectIds = [\n    ...new Set(\n      recentSessions.map((session) => session.assessmentProjectId),\n    ),\n  ];\n\n  const recentProjectQuestionnaires =\n    recentSessionProjectIds.length > 0\n      ? await db\n          .select({\n            assessmentProjectId:\n              assessmentProjectQuestionnaires.assessmentProjectId,\n            questionnaireVersionId:\n              assessmentProjectQuestionnaires.questionnaireVersionId,\n            orderIndex: assessmentProjectQuestionnaires.orderIndex,\n          })\n          .from(assessmentProjectQuestionnaires)\n          .where(\n            and(\n              inArray(\n                assessmentProjectQuestionnaires.assessmentProjectId,\n                recentSessionProjectIds,\n              ),\n              isNull(assessmentProjectQuestionnaires.deletedAt),\n            ),\n          )\n          .orderBy(\n            assessmentProjectQuestionnaires.assessmentProjectId,\n            assessmentProjectQuestionnaires.orderIndex,\n          )\n      : [];\n\n  const recentQuestionnaireVersionIds = [\n    ...new Set(\n      recentProjectQuestionnaires.map(\n        (row) => row.questionnaireVersionId,\n      ),\n    ),\n  ];\n\n  const recentQuestionnaireVersions =\n    recentQuestionnaireVersionIds.length > 0\n      ? await controlDb\n          .select({\n            id: questionnaireVersions.id,\n            questionnaireName: questionnaires.name,\n            versionName: questionnaireVersions.name,\n          })\n          .from(questionnaireVersions)\n          .leftJoin(\n            questionnaires,\n            eq(questionnaires.id, questionnaireVersions.questionnaireId),\n          )\n          .where(\n            inArray(\n              questionnaireVersions.id,\n              recentQuestionnaireVersionIds,\n            ),\n          )\n      : [];\n\n  const questionnaireNameByVersionId = new Map(\n    recentQuestionnaireVersions.map((row) => [\n      row.id,\n      row.questionnaireName ?? row.versionName,\n    ]),\n  );\n\n  const questionnaireNamesByProjectId = new Map<string, string[]>();\n\n  for (const row of recentProjectQuestionnaires) {\n    const questionnaireName = questionnaireNameByVersionId.get(\n      row.questionnaireVersionId,\n    );\n\n    if (!questionnaireName) {\n      continue;\n    }\n\n    const names =\n      questionnaireNamesByProjectId.get(row.assessmentProjectId) ?? [];\n\n    if (!names.includes(questionnaireName)) {\n      names.push(questionnaireName);\n    }\n\n    questionnaireNamesByProjectId.set(row.assessmentProjectId, names);\n  }\n\n  const enrichedRecentSessions = recentSessions.map((session) => ({\n    ...session,\n    questionnaireNames:\n      questionnaireNamesByProjectId.get(session.assessmentProjectId) ?? [],\n  }));\n\n  const sessionStatus = {\n    notStarted: 0,`,
    "wzbogacenie sesji o nazwy kwestionariuszy",
  );

  content = replaceExactlyOnce(
    content,
    `    recentSessions,\n    recentOrders,`,
    `    recentSessions: enrichedRecentSessions,\n    recentOrders,`,
    "zwracanie wzbogaconych sesji",
  );

  content = replaceExactlyOnce(
    content,
    `                          <p className="truncate font-mono text-xs text-[#8b9099]">\n                            {session.id}\n                          </p>\n\n                          <div className="mt-2">`,
    `                          <p className="truncate text-sm font-semibold text-[#171717]">\n                            {session.respondentEmail ??\n                              "Brak adresu e-mail respondenta"}\n                          </p>\n\n                          <p\n                            className="mt-1 line-clamp-2 text-sm leading-6 text-[#6b7280]"\n                            title={session.questionnaireNames.join(", ")}\n                          >\n                            {session.questionnaireNames.length > 0\n                              ? session.questionnaireNames.join(", ")\n                              : "Brak przypisanego kwestionariusza"}\n                          </p>\n\n                          <div className="mt-3">`,
    "UI ostatnich sesji",
  );

  content = replaceExactlyOnce(
    content,
    `                          <p className="truncate font-mono text-xs text-[#8b9099]">\n                            {order.id}\n                          </p>\n\n                          <div className="mt-2">`,
    `                          <p className="truncate text-sm font-semibold text-[#171717]">\n                            {order.buyerEmail ??\n                              "Brak adresu e-mail kupującego"}\n                          </p>\n\n                          <div className="mt-3">`,
    "UI ostatnich zakupów",
  );

  return { content, alreadyInstalled: false };
}

function staticVerification(content) {
  const required = [
    "respondentEmail: respondentIdentities.email",
    "buyerEmail: users.email",
    "questionnaireNamesByProjectId",
    "recentSessions: enrichedRecentSessions",
    "Brak adresu e-mail respondenta",
    "Brak adresu e-mail kupującego",
    "Brak przypisanego kwestionariusza",
  ];

  for (const token of required) {
    if (!content.includes(token)) {
      fail(`Weryfikacja statyczna nie powiodła się: brak ${JSON.stringify(token)}.`);
    }
  }

  if (content.includes("{session.id}\n                          </p>")) {
    fail("Weryfikacja statyczna: UI sesji nadal pokazuje surowe ID.");
  }

  if (content.includes("{order.id}\n                          </p>")) {
    fail("Weryfikacja statyczna: UI zakupu nadal pokazuje surowe ID.");
  }
}

function commandOutput(errorOrOutput) {
  if (typeof errorOrOutput === "string") {
    return errorOrOutput;
  }

  if (Buffer.isBuffer(errorOrOutput)) {
    return errorOrOutput.toString("utf8");
  }

  return "";
}

function captureCommand(root, command, commandArgs, label) {
  log(`Sprawdzam: ${label}`);

  try {
    const stdout = execFileSync(command, commandArgs, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
    });

    return {
      ok: true,
      output: commandOutput(stdout).trim(),
      status: 0,
    };
  } catch (error) {
    const stdout =
      error && typeof error === "object" && "stdout" in error
        ? commandOutput(error.stdout)
        : "";
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? commandOutput(error.stderr)
        : "";
    const status =
      error && typeof error === "object" && "status" in error
        ? Number(error.status ?? 1)
        : 1;

    return {
      ok: false,
      output: [stdout, stderr].filter(Boolean).join("\n").trim(),
      status: Number.isFinite(status) ? status : 1,
    };
  }
}

function normalizeOutput(output, root) {
  return output
    .replaceAll(`${root}/`, "")
    .replaceAll(`${root}\\`, "")
    .replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, "")
    .replace(/\r/g, "")
    .trim();
}

function parseTypeScriptDiagnostics(output, root) {
  const diagnostics = new Map();
  const normalized = normalizeOutput(output, root);

  for (const line of normalized.split("\n")) {
    const compactMatch = line.match(
      /^(.*)\((\d+),(\d+)\): error (TS\d+): (.*)$/,
    );
    const prettyMatch = line.match(
      /^(.*):(\d+):(\d+)\s+-\s+error (TS\d+):\s+(.*)$/,
    );
    const match = compactMatch ?? prettyMatch;

    if (!match) {
      continue;
    }

    const [, file, , , code, message] = match;
    const signature = `${file.trim()}|${code}|${message.trim()}`;

    diagnostics.set(signature, line.trim());
  }

  return diagnostics;
}

function parseFailureSignatures(output, root) {
  const normalized = normalizeOutput(output, root);
  const signatures = new Map();

  for (const originalLine of normalized.split("\n")) {
    const line = originalLine.trim();

    if (!line) {
      continue;
    }

    const looksRelevant =
      /(^|\s)(error|failed|failure|fail|type error|module not found|cannot find module|command failed)(\s|:|$)/i.test(
        line,
      ) ||
      /\bTS\d+\b/.test(line) ||
      /^(FAIL|⨯|×|✖)/.test(line);

    if (!looksRelevant) {
      continue;
    }

    const signature = line
      .replace(/\b\d+(?:\.\d+)?\s*(ms|s|min)\b/gi, "<duration>")
      .replace(/\b\d+(?:\.\d+)?\s*(KB|MB|GB)\b/gi, "<size>")
      .replace(/:\d+:\d+/g, ":<line>:<column>")
      .replace(/\(\d+,\d+\)/g, "(<line>,<column>)");

    signatures.set(signature, line);
  }

  return signatures;
}

function printExistingFailures(label, result, root) {
  const normalized = normalizeOutput(result.output, root);
  const excerpt = normalized.split("\n").slice(0, 40).join("\n");

  log(
    `UWAGA: ${label} ma błędy istniejące już przed instalacją. ` +
      "Nie blokują tej zmiany, ponieważ po instalacji nie pojawiły się nowe diagnostyki.",
  );

  if (excerpt) {
    console.log(`\n--- istniejące błędy: ${label} ---\n${excerpt}\n--- koniec ---\n`);
  }
}

function verifyTypeScriptAgainstBaseline(root, localTsc, baseline) {
  const after = captureCommand(
    root,
    localTsc,
    ["--noEmit", "--pretty", "false"],
    "TypeScript po zmianie (tsc --noEmit)",
  );

  if (after.ok) {
    log("TypeScript po zmianie: bez błędów.");
    return;
  }

  if (baseline.ok) {
    console.error(normalizeOutput(after.output, root));
    fail("Zmiana wprowadziła błędy TypeScript.");
  }

  const beforeDiagnostics = parseTypeScriptDiagnostics(
    baseline.output,
    root,
  );
  const afterDiagnostics = parseTypeScriptDiagnostics(after.output, root);
  const newDiagnostics = [...afterDiagnostics.entries()].filter(
    ([signature]) => !beforeDiagnostics.has(signature),
  );

  if (newDiagnostics.length > 0) {
    console.error(
      `\nNowe błędy TypeScript po zmianie:\n${newDiagnostics
        .map(([, line]) => line)
        .join("\n")}`,
    );
    fail("Zmiana wprowadziła nowe błędy TypeScript.");
  }

  if (afterDiagnostics.size === 0) {
    const beforeNormalized = normalizeOutput(baseline.output, root);
    const afterNormalized = normalizeOutput(after.output, root);

    if (beforeNormalized !== afterNormalized) {
      console.error(afterNormalized);
      fail(
        "TypeScript nadal kończy się błędem, którego nie udało się bezpiecznie porównać ze stanem początkowym.",
      );
    }
  }

  printExistingFailures("TypeScript", after, root);
}

function verifyGenericCommandAgainstBaseline({
  root,
  command,
  commandArgs,
  label,
  baseline,
}) {
  const after = captureCommand(root, command, commandArgs, `${label} po zmianie`);

  if (after.ok) {
    log(`${label} po zmianie: powodzenie.`);
    return;
  }

  if (baseline.ok) {
    console.error(normalizeOutput(after.output, root));
    fail(`${label} nie przechodzi po zmianie.`);
  }

  const beforeSignatures = parseFailureSignatures(baseline.output, root);
  const afterSignatures = parseFailureSignatures(after.output, root);
  const newSignatures = [...afterSignatures.entries()].filter(
    ([signature]) => !beforeSignatures.has(signature),
  );

  if (newSignatures.length > 0) {
    console.error(
      `\nNowe sygnatury błędów (${label}):\n${newSignatures
        .map(([, line]) => line)
        .join("\n")}`,
    );
    fail(`${label} wykazał nowe błędy po zmianie.`);
  }

  if (beforeSignatures.size === 0) {
    const beforeNormalized = normalizeOutput(baseline.output, root);
    const afterNormalized = normalizeOutput(after.output, root);

    if (beforeNormalized !== afterNormalized) {
      console.error(afterNormalized);
      fail(
        `${label} nadal kończy się błędem, którego nie udało się bezpiecznie porównać ze stanem początkowym.`,
      );
    }
  }

  printExistingFailures(label, after, root);
}

function resolveVerificationCommands(root) {
  if (skipCommands) {
    log("Pominięto komendy weryfikacyjne (--skip-commands).");
    return null;
  }

  const localTsc = join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc",
  );

  if (!existsSync(localTsc)) {
    log(
      "UWAGA: brak node_modules/.bin/tsc — wykonana zostanie wyłącznie " +
        "weryfikacja statyczna. Po npm ci uruchom: npm exec tsc -- --noEmit",
    );
    return null;
  }

  return {
    localTsc,
    npm: process.platform === "win32" ? "npm.cmd" : "npm",
  };
}

function captureBaseline(root, commands) {
  if (!commands) {
    return null;
  }

  const baseline = {
    typescript: captureCommand(
      root,
      commands.localTsc,
      ["--noEmit", "--pretty", "false"],
      "stan początkowy TypeScript",
    ),
    tests: null,
    build: null,
  };

  if (isFullVerification) {
    baseline.tests = captureCommand(
      root,
      commands.npm,
      ["test"],
      "stan początkowy testów Vitest",
    );
    baseline.build = captureCommand(
      root,
      commands.npm,
      ["run", "build"],
      "stan początkowy buildu produkcyjnego",
    );
  }

  return baseline;
}

function commandVerification(root, commands, baseline) {
  if (!commands || !baseline) {
    return;
  }

  verifyTypeScriptAgainstBaseline(
    root,
    commands.localTsc,
    baseline.typescript,
  );

  if (isFullVerification) {
    verifyGenericCommandAgainstBaseline({
      root,
      command: commands.npm,
      commandArgs: ["test"],
      label: "Testy Vitest",
      baseline: baseline.tests,
    });
    verifyGenericCommandAgainstBaseline({
      root,
      command: commands.npm,
      commandArgs: ["run", "build"],
      label: "Build produkcyjny Next.js",
      baseline: baseline.build,
    });
  }
}

function main() {
  const root = resolve(process.cwd());
  const targetPath = ensureProjectRoot(root);

  if (isRollback) {
    rollback(root, targetPath);
    return;
  }

  const original = readFileSync(targetPath, "utf8");
  log(`Plik wejściowy: ${TARGET}`);
  log(`SHA-256 przed zmianą: ${sha256(original)}`);

  const { content, alreadyInstalled } = patchDashboard(original);
  staticVerification(content);

  if (isDryRun) {
    if (alreadyInstalled) {
      log("Dry run: zmiana jest już zainstalowana.");
    } else {
      log(`Dry run poprawny. Planowana zmiana SHA-256: ${sha256(content)}`);
    }
    return;
  }

  const commands = resolveVerificationCommands(root);

  if (alreadyInstalled) {
    if (commands) {
      const current = captureCommand(
        root,
        commands.localTsc,
        ["--noEmit", "--pretty", "false"],
        "TypeScript dla już zainstalowanej zmiany",
      );

      if (!current.ok) {
        log(
          "UWAGA: repozytorium ma błędy TypeScript, ale instalator nie modyfikował pliku, " +
            "więc nie wykonano rollbacku.",
        );
        console.log(normalizeOutput(current.output, root));
      }
    }

    log("Zmiana jest już zainstalowana; weryfikacja statyczna zakończona powodzeniem.");
    return;
  }

  // Kluczowa różnica względem v1: najpierw zapisujemy stan istniejących błędów.
  // Po instalacji rollback nastąpi tylko wtedy, gdy pojawią się nowe diagnostyki.
  const baseline = captureBaseline(root, commands);
  const backupDir = makeBackup(root, targetPath, original);
  log(`Backup: ${backupDir}`);

  try {
    writeFileSync(targetPath, content, "utf8");
    staticVerification(readFileSync(targetPath, "utf8"));
    commandVerification(root, commands, baseline);
    log(`Instalacja zakończona. SHA-256 po zmianie: ${sha256(content)}`);
  } catch (error) {
    writeFileSync(targetPath, original, "utf8");
    log(
      "Błąd wprowadzony przez instalację lub niejednoznaczna weryfikacja — " +
        "automatycznie przywrócono plik sprzed zmiany.",
    );
    throw error;
  }
}

try {
  main();
} catch (error) {
  console.error(`\n[${PATCH_ID}] BŁĄD: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
