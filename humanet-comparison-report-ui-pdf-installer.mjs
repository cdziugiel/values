#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const INSTALLER_ID = "comparison-report-ui-pdf-v1";
const INSTALLER_MARKER = "HUMANET_INSTALLER: comparison-report-ui-pdf-v1";

const PATHS = {
  page: "app/(protected)/my/assessment/comparison-reports/grants/[grantId]/page.tsx",
  helper: "features/comparison-reports/api/my-comparison-report-grant.queries.ts",
  print: "app/(print)/my/assessment/comparison-reports/grants/[grantId]/print/page.tsx",
  pdf: "app/(protected)/my/assessment/comparison-reports/grants/[grantId]/pdf/route.ts",
};

function parseArgs(argv) {
  const args = [...argv];
  const command = args.find((arg) => !arg.startsWith("--")) ?? "install";
  const rootArg = args.find((arg) => arg.startsWith("--root="));
  return {
    command,
    root: path.resolve(rootArg ? rootArg.slice("--root=".length) : process.cwd()),
    dryRun: args.includes("--dry-run"),
    typecheck: args.includes("--typecheck"),
  };
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeUtf8(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function assertRepoRoot(root) {
  const packageJson = path.join(root, "package.json");
  const targetPage = path.join(root, PATHS.page);

  if (!exists(packageJson) || !exists(targetPage)) {
    throw new Error(
      [
        "Nie rozpoznano katalogu głównego repozytorium HUMANET VALUES.",
        `Oczekiwano: ${PATHS.page}`,
        "Uruchom instalator w katalogu repo lub użyj --root=/sciezka/do/repo.",
      ].join("\n"),
    );
  }
}

function stateFile(root) {
  return path.join(root, ".humanet-installer-state", `${INSTALLER_ID}.json`);
}

function backupBase(root) {
  return path.join(root, ".humanet-installer-backups", INSTALLER_ID);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const PREVIEW_IMPORT =
  'import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";';

const SUCCESS_RETURN = `  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            HUMANET VALUES · Raport porównawczy
          </div>

          <h1 className="mt-1 text-3xl font-semibold">
            Raport porównawczy
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {reportTemplateVersion.name} · widoczne strony: {rendered.visiblePages.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <a
              href={
                "/my/assessment/comparison-reports/grants/" +
                grantId +
                "/pdf"
              }
              target="_blank"
              rel="noreferrer"
            >
              Pobierz PDF
            </a>
          </Button>

          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do raportów
            </Link>
          </Button>
        </div>
      </div>

      <ReportDocumentPreviewFrame html={rendered.html} />
    </main>
  );
}`;

function patchComparisonPage(source) {
  if (source.includes(INSTALLER_MARKER)) {
    return source;
  }

  if (!source.includes('renderReportDocument({')) {
    throw new Error("Nie znaleziono renderReportDocument() w stronie raportu porównawczego.");
  }

  let output = source;

  output = output.replace(
    'import { ArrowLeft, BarChart3 } from "lucide-react";',
    'import { ArrowLeft } from "lucide-react";',
  );

  if (!output.includes(PREVIEW_IMPORT)) {
    const importNeedle =
      'import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";';

    if (!output.includes(importNeedle)) {
      throw new Error("Nie znaleziono importu report-template-renderer w stronie raportu porównawczego.");
    }

    output = output.replace(
      importNeedle,
      `${importNeedle}\n${PREVIEW_IMPORT}`,
    );
  }

  const renderIndex = output.lastIndexOf("  const rendered = renderReportDocument({");
  if (renderIndex < 0) {
    throw new Error("Nie znaleziono końcowego renderowania raportu porównawczego.");
  }

  const successStart = output.indexOf(
    '  return (\n    <main className="min-h-screen bg-[#f3f4f6]">',
    renderIndex,
  );

  if (successStart < 0) {
    throw new Error(
      "Nie znaleziono oczekiwanego bloku sukcesu (sticky toolbar + iframe). Repozytorium mogło się zmienić; instalator niczego nie nadpisze.",
    );
  }

  const functionEndPattern = "\n  );\n}";
  const successEnd = output.indexOf(functionEndPattern, successStart);

  if (successEnd < 0) {
    throw new Error("Nie udało się bezpiecznie wyznaczyć końca bloku strony raportu porównawczego.");
  }

  const afterSuccess = successEnd + functionEndPattern.length;
  output = output.slice(0, successStart) + SUCCESS_RETURN + output.slice(afterSuccess);

  const firstLineEnd = output.indexOf("\n");
  if (firstLineEnd >= 0) {
    output =
      output.slice(0, firstLineEnd + 1) +
      `// ${INSTALLER_MARKER}\n` +
      output.slice(firstLineEnd + 1);
  } else {
    output = `// ${INSTALLER_MARKER}\n${output}`;
  }

  return output;
}

const HELPER_CONTENT = `// ${INSTALLER_MARKER}
// Wspólna, serwerowa ścieżka dostępu używana wyłącznie przez print/PDF raportu porównawczego.

import { and, eq, isNull, or } from "drizzle-orm";

import { reportAccessGrants } from "@/drizzle/schema";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

import {
  getUserVsUserComparisonReport,
  readComparisonDefinition,
} from "./comparison-report-render.queries";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function isGrantCurrentlyActive(grant: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (grant.status !== "active") return false;

  const now = new Date();

  if (grant.validFrom && grant.validFrom > now) return false;
  if (grant.validUntil && grant.validUntil < now) return false;

  return true;
}

export async function resolveMyComparisonReportGrantForRender({
  grantId,
}: {
  grantId: string;
}) {
  const session = await requireSession();
  const userId = session.user?.id;
  const email = normalizeEmail(session.user?.email);

  if (!grantId || !userId || !email) {
    return null;
  }

  const [grant] = await controlDb
    .select({
      id: reportAccessGrants.id,
      tenantSlug: reportAccessGrants.tenantSlug,
      status: reportAccessGrants.status,
      userId: reportAccessGrants.userId,
      email: reportAccessGrants.email,
      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,
      assessmentProjectId: reportAccessGrants.assessmentProjectId,
      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
        or(
          eq(reportAccessGrants.userId, userId),
          eq(reportAccessGrants.email, email),
        ),
      ),
    )
    .limit(1);

  if (!grant || !isGrantCurrentlyActive(grant)) {
    return null;
  }

  if (grant.subjectType !== "comparison") {
    return null;
  }

  if (!grant.assessmentProjectId || !grant.reportTemplateVersionId) {
    return null;
  }

  const comparisonDefinition = readComparisonDefinition(grant.metadata);

  if (!comparisonDefinition) {
    return null;
  }

  const [data, reportTemplateVersion] = await Promise.all([
    getUserVsUserComparisonReport({
      tenantSlug: grant.tenantSlug,
      assessmentProjectId: grant.assessmentProjectId,
      reportTemplateVersionId: grant.reportTemplateVersionId,
      comparisonDefinition,
    }),
    getReportTemplateVersionForRender({
      reportTemplateVersionId: grant.reportTemplateVersionId,
    }),
  ]);

  if (!data || !reportTemplateVersion) {
    return null;
  }

  return {
    grant,
    data,
    reportTemplateVersion,
  };
}
`;

const PRINT_CONTENT = `// ${INSTALLER_MARKER}
// Minimalny layout wydruku: bez ProtectedAppShell, topbara i toolbarów aplikacji.

import { notFound } from "next/navigation";

import { resolveMyComparisonReportGrantForRender } from "@/features/comparison-reports/api/my-comparison-report-grant.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    grantId: string;
  }>;
};

export default async function MyComparisonReportPrintPage({
  params,
}: PageProps) {
  const { grantId } = await params;

  const resolved = await resolveMyComparisonReportGrantForRender({
    grantId,
  });

  if (!resolved || !resolved.data.eligibility.canRender) {
    notFound();
  }

  const payload = resolved.data.payload;

  if (!payload) {
    notFound();
  }

  const rendered = renderReportDocument({
    reportTemplateVersion: resolved.reportTemplateVersion,
    payload,
  });

  return (
    <main
      className="report-print-root"
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  );
}
`;

const PDF_CONTENT = `// ${INSTALLER_MARKER}

import { NextRequest } from "next/server";

import { resolveMyComparisonReportGrantForRender } from "@/features/comparison-reports/api/my-comparison-report-grant.queries";
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";
import { resolveReportRenderOrigin } from "@/features/report-builder/lib/resolve-report-render-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    grantId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { grantId } = await params;

  const resolved = await resolveMyComparisonReportGrantForRender({
    grantId,
  });

  if (!resolved) {
    return new Response("Nie znaleziono dostępnego raportu porównawczego.", {
      status: 404,
    });
  }

  if (!resolved.data.eligibility.canRender || !resolved.data.payload) {
    return new Response(
      "Nie można wygenerować raportu porównawczego, ponieważ brakuje wymaganych danych źródłowych.",
      { status: 409 },
    );
  }

  const printUrl = new URL(
    "/my/assessment/comparison-reports/grants/" +
      encodeURIComponent(grantId) +
      "/print",
    resolveReportRenderOrigin(request),
  );

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader: request.headers.get("cookie") ?? undefined,
  });

  const filename = "humanet-comparison-report-" + grantId + ".pdf";

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
`;

function checkManagedPathSafety(root, relativePath) {
  const absolute = path.join(root, relativePath);
  if (!exists(absolute)) return;

  const content = readUtf8(absolute);
  if (!content.includes(INSTALLER_MARKER)) {
    throw new Error(
      `Plik ${relativePath} już istnieje i nie został utworzony przez ten instalator. Przerywam, aby nie nadpisać cudzych zmian.`,
    );
  }
}

function createBackup(root, relativePaths) {
  const dir = path.join(backupBase(root), timestamp());
  const entries = [];

  for (const relativePath of relativePaths) {
    const absolute = path.join(root, relativePath);
    const present = exists(absolute);
    const entry = {
      path: relativePath,
      existed: present,
      sha256Before: null,
      backupRelativePath: null,
    };

    if (present) {
      const content = fs.readFileSync(absolute);
      entry.sha256Before = sha256(content);
      const backupRelativePath = path.join("files", relativePath);
      const backupPath = path.join(dir, backupRelativePath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(absolute, backupPath);
      entry.backupRelativePath = backupRelativePath;
    }

    entries.push(entry);
  }

  const manifest = {
    installerId: INSTALLER_ID,
    createdAt: new Date().toISOString(),
    repoRoot: root,
    backupDir: dir,
    entries,
  };

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return manifest;
}

function restoreFromManifest(root, manifest) {
  for (const entry of manifest.entries) {
    const absolute = path.join(root, entry.path);

    if (entry.existed) {
      const backupPath = path.join(manifest.backupDir, entry.backupRelativePath);
      if (!exists(backupPath)) {
        throw new Error(`Brak pliku backupu: ${backupPath}`);
      }
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.copyFileSync(backupPath, absolute);
    } else {
      fs.rmSync(absolute, { force: true });
    }
  }
}

function verifyRollback(root, manifest) {
  const errors = [];

  for (const entry of manifest.entries) {
    const absolute = path.join(root, entry.path);

    if (entry.existed) {
      if (!exists(absolute)) {
        errors.push(`${entry.path}: po rollbacku plik nie istnieje`);
        continue;
      }
      const current = sha256(fs.readFileSync(absolute));
      if (current !== entry.sha256Before) {
        errors.push(`${entry.path}: SHA-256 nie odpowiada backupowi`);
      }
    } else if (exists(absolute)) {
      errors.push(`${entry.path}: plik utworzony przez instalator nadal istnieje`);
    }
  }

  return errors;
}

function verifyInstall(root, { quiet = false } = {}) {
  const errors = [];
  const checks = [];

  const pagePath = path.join(root, PATHS.page);
  const helperPath = path.join(root, PATHS.helper);
  const printPath = path.join(root, PATHS.print);
  const pdfPath = path.join(root, PATHS.pdf);

  const required = [pagePath, helperPath, printPath, pdfPath];
  for (const file of required) {
    if (!exists(file)) {
      errors.push(`Brakuje pliku: ${path.relative(root, file)}`);
    }
  }

  if (errors.length === 0) {
    const page = readUtf8(pagePath);
    const helper = readUtf8(helperPath);
    const print = readUtf8(printPath);
    const pdf = readUtf8(pdfPath);

    const predicates = [
      [page.includes(INSTALLER_MARKER), "strona ma marker instalatora"],
      [page.includes("ReportDocumentPreviewFrame"), "strona używa wspólnego preview frame"],
      [page.includes("Pobierz PDF"), "strona zawiera przycisk PDF"],
      [!page.includes('className="sticky top-0'), "usunięto nested sticky powodujący lukę"],
      [!page.includes('title="Raport porównawczy"\n        srcDoc='), "usunięto surowy iframe sukcesu"],
      [helper.includes("resolveMyComparisonReportGrantForRender"), "helper centralizuje dostęp print/PDF"],
      [print.includes("report-print-root"), "print route renderuje czysty dokument"],
      [pdf.includes("renderReportPdfFromUrl"), "PDF korzysta ze wspólnego renderera Playwright"],
      [pdf.includes("Cache-Control"), "PDF ma prywatny cache policy"],
    ];

    for (const [ok, label] of predicates) {
      if (ok) checks.push(label);
      else errors.push(label);
    }
  }

  if (!quiet) {
    if (checks.length) {
      console.log("[verify] OK:");
      for (const check of checks) console.log(`  ✓ ${check}`);
    }
    if (errors.length) {
      console.error("[verify] BŁĘDY:");
      for (const error of errors) console.error(`  ✗ ${error}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function runTypecheck(root) {
  const tscJs = path.join(root, "node_modules", "typescript", "bin", "tsc");
  if (!exists(tscJs)) {
    throw new Error(
      "Nie znaleziono lokalnego TypeScript w node_modules. Najpierw zainstaluj zależności albo uruchom verify bez --typecheck.",
    );
  }

  console.log("[verify] Uruchamiam TypeScript: tsc --noEmit --pretty false");
  const result = spawnSync(process.execPath, [tscJs, "--noEmit", "--pretty", "false"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`TypeScript zakończył się kodem ${result.status ?? "unknown"}.`);
  }
}

function install(root, { dryRun }) {
  assertRepoRoot(root);

  const activeState = stateFile(root);
  if (exists(activeState)) {
    const current = verifyInstall(root, { quiet: true });
    if (current.ok) {
      console.log("Zmiana jest już zainstalowana. Uruchom verify albo rollback.");
      return;
    }

    throw new Error(
      "Istnieje stan poprzedniej instalacji, ale verify nie przechodzi. Najpierw uruchom rollback.",
    );
  }

  checkManagedPathSafety(root, PATHS.helper);
  checkManagedPathSafety(root, PATHS.print);
  checkManagedPathSafety(root, PATHS.pdf);

  const pagePath = path.join(root, PATHS.page);
  const pageBefore = readUtf8(pagePath);
  const pageAfter = patchComparisonPage(pageBefore);

  const outputs = new Map([
    [PATHS.page, pageAfter],
    [PATHS.helper, HELPER_CONTENT],
    [PATHS.print, PRINT_CONTENT],
    [PATHS.pdf, PDF_CONTENT],
  ]);

  if (dryRun) {
    console.log("[dry-run] Zmodyfikowane/utworzone zostałyby:");
    for (const relativePath of outputs.keys()) {
      console.log(`  - ${relativePath}`);
    }
    console.log("[dry-run] Nie zapisano żadnych zmian.");
    return;
  }

  const manifest = createBackup(root, [...outputs.keys()]);

  try {
    for (const [relativePath, content] of outputs) {
      writeUtf8(path.join(root, relativePath), content);
    }

    const verification = verifyInstall(root);
    if (!verification.ok) {
      throw new Error("Weryfikacja po instalacji nie powiodła się.");
    }

    fs.mkdirSync(path.dirname(activeState), { recursive: true });
    fs.writeFileSync(
      activeState,
      JSON.stringify(
        {
          installerId: INSTALLER_ID,
          installedAt: new Date().toISOString(),
          backupDir: manifest.backupDir,
          manifestPath: path.join(manifest.backupDir, "manifest.json"),
        },
        null,
        2,
      ),
      "utf8",
    );

    console.log("\nInstalacja zakończona pomyślnie.");
    console.log(`Backup: ${path.relative(root, manifest.backupDir)}`);
    console.log("Weryfikacja: node humanet-comparison-report-ui-pdf-installer.mjs verify");
    console.log("Rollback:      node humanet-comparison-report-ui-pdf-installer.mjs rollback");
  } catch (error) {
    console.error("\nInstalacja nie powiodła się. Przywracam stan sprzed instalacji...");
    restoreFromManifest(root, manifest);
    const rollbackErrors = verifyRollback(root, manifest);
    if (rollbackErrors.length) {
      console.error("Rollback automatyczny zgłosił problemy:");
      for (const item of rollbackErrors) console.error(`  - ${item}`);
    } else {
      console.log("Rollback automatyczny zakończony poprawnie.");
    }
    throw error;
  }
}

function rollback(root) {
  assertRepoRoot(root);
  const activeState = stateFile(root);

  if (!exists(activeState)) {
    throw new Error("Brak aktywnej instalacji do cofnięcia.");
  }

  const state = JSON.parse(readUtf8(activeState));
  if (!state.manifestPath || !exists(state.manifestPath)) {
    throw new Error("Nie znaleziono manifestu backupu dla aktywnej instalacji.");
  }

  const manifest = JSON.parse(readUtf8(state.manifestPath));
  restoreFromManifest(root, manifest);

  const errors = verifyRollback(root, manifest);
  if (errors.length) {
    console.error("Rollback wykonano, ale weryfikacja wykazała problemy:");
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exitCode = 2;
    return;
  }

  fs.rmSync(activeState, { force: true });
  console.log("Rollback zakończony poprawnie. Przywrócono pliki 1:1 z backupu.");
  console.log(`Backup pozostawiono w: ${path.relative(root, manifest.backupDir)}`);
}

function status(root) {
  assertRepoRoot(root);
  const activeState = stateFile(root);
  if (!exists(activeState)) {
    console.log("Status: nie zainstalowano / brak aktywnego stanu instalatora.");
    return;
  }

  const state = JSON.parse(readUtf8(activeState));
  console.log("Status: zainstalowano");
  console.log(`Data:   ${state.installedAt}`);
  console.log(`Backup: ${path.relative(root, state.backupDir)}`);
  const verification = verifyInstall(root);
  if (!verification.ok) process.exitCode = 2;
}

function printHelp() {
  console.log(`
HUMANET comparison report UI/PDF installer

Użycie:
  node humanet-comparison-report-ui-pdf-installer.mjs install [--root=/repo] [--dry-run]
  node humanet-comparison-report-ui-pdf-installer.mjs verify  [--root=/repo] [--typecheck]
  node humanet-comparison-report-ui-pdf-installer.mjs rollback [--root=/repo]
  node humanet-comparison-report-ui-pdf-installer.mjs status [--root=/repo]

Co zmienia:
  1) usuwa nested sticky/iframe z raportu porównawczego i używa wspólnego ReportDocumentPreviewFrame,
  2) dodaje przycisk Pobierz PDF,
  3) dodaje bezpieczny print route bez AppShell,
  4) dodaje PDF route korzystający z istniejącego renderera Playwright,
  5) zachowuje kontrolę dostępu do grantu i ważność grantu po stronie serwera.
`);
}

const options = parseArgs(process.argv.slice(2));

try {
  switch (options.command) {
    case "install":
      install(options.root, options);
      break;
    case "verify": {
      assertRepoRoot(options.root);
      const result = verifyInstall(options.root);
      if (!result.ok) {
        process.exitCode = 2;
      } else if (options.typecheck) {
        runTypecheck(options.root);
      }
      break;
    }
    case "rollback":
      rollback(options.root);
      break;
    case "status":
      status(options.root);
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      printHelp();
      throw new Error(`Nieznane polecenie: ${options.command}`);
  }
} catch (error) {
  console.error(`\nBŁĄD: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
