#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";

import {
  dirname,
  join,
  relative,
  resolve,
} from "node:path";

import {
  fileURLToPath,
} from "node:url";

const ROOT = process.cwd();

const SCRIPT_DIR =
  dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const OLD_ROUTE =
  "app/(protected)/my/reports/composite/grants/[grantId]/print/route.ts";

const NEW_PAGE =
  "app/(print)/my/reports/composite/grants/[grantId]/print/page.tsx";

const STANDARD_PRINT_PAGE =
  "app/(print)/my/assessment/sessions/[sessionId]/report/[reportTemplateVersionId]/print/page.tsx";

const RENDERER =
  "features/report-builder/lib/render-report-pdf.ts";

const COMPOSITE_PDF =
  "app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts";

const REPLACEMENT_PAGE =
  join(
    SCRIPT_DIR,
    "replacements",
    "page.tsx",
  );

function abs(path) {
  return resolve(ROOT, path);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateRepository() {
  const packagePath =
    abs("package.json");

  assert(
    existsSync(packagePath),
    "Uruchom skrypt z katalogu głównego humanet-values.",
  );

  const packageJson =
    JSON.parse(
      readFileSync(
        packagePath,
        "utf8",
      ),
    );

  assert(
    packageJson.name === "humanet-values",
    `Nieoczekiwany projekt: ${packageJson.name ?? "brak nazwy"}.`,
  );
}

function validatePrerequisites() {
  assert(
    existsSync(abs(OLD_ROUTE)),
    `Brakuje aktualnej trasy composite: ${OLD_ROUTE}`,
  );

  assert(
    existsSync(abs(STANDARD_PRINT_PAGE)),
    `Brakuje wzorcowej strony standardowego wydruku: ${STANDARD_PRINT_PAGE}`,
  );

  assert(
    existsSync(abs(RENDERER)),
    `Brakuje ${RENDERER}`,
  );

  assert(
    existsSync(abs(COMPOSITE_PDF)),
    `Brakuje ${COMPOSITE_PDF}`,
  );

  assert(
    existsSync(REPLACEMENT_PAGE),
    `Brakuje pliku poprawki: ${REPLACEMENT_PAGE}`,
  );

  const renderer =
    readFileSync(
      abs(RENDERER),
      "utf8",
    );

  assert(
    renderer.includes(
      "renderReportPdfFromUrl",
    ),
    "Nie rozpoznano działającego wspólnego renderera.",
  );

  const compositePdf =
    readFileSync(
      abs(COMPOSITE_PDF),
      "utf8",
    );

  assert(
    compositePdf.includes(
      "renderReportPdfFromUrl",
    ),
    "Composite PDF nie korzysta obecnie ze wspólnego renderera URL.",
  );

  const oldRoute =
    readFileSync(
      abs(OLD_ROUTE),
      "utf8",
    );

  assert(
    oldRoute.includes(
      "getMyPersonalCompositeReportByGrantForCurrentUser",
    ),
    "Aktualna trasa composite nie ma oczekiwanej user-safe autoryzacji.",
  );
}

function timestamp() {
  return new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");
}

function createBackup() {
  const backupRoot =
    abs(
      join(
        ".humanet-composite-print-layout-backup",
        timestamp(),
      ),
    );

  mkdirSync(
    backupRoot,
    {
      recursive: true,
    },
  );

  const files = [
    OLD_ROUTE,
    NEW_PAGE,
  ];

  const manifest = {
    createdAt:
      new Date().toISOString(),
    files: [],
  };

  for (const path of files) {
    const source =
      abs(path);

    const existed =
      existsSync(source);

    manifest.files.push({
      path,
      existed,
    });

    if (!existed) {
      continue;
    }

    const destination =
      join(
        backupRoot,
        path,
      );

    mkdirSync(
      dirname(destination),
      {
        recursive: true,
      },
    );

    copyFileSync(
      source,
      destination,
    );
  }

  writeFileSync(
    join(
      backupRoot,
      "manifest.json",
    ),
    JSON.stringify(
      manifest,
      null,
      2,
    ),
    "utf8",
  );

  return backupRoot;
}

function restoreBackup(backupRoot) {
  const manifest =
    JSON.parse(
      readFileSync(
        join(
          backupRoot,
          "manifest.json",
        ),
        "utf8",
      ),
    );

  for (const file of manifest.files) {
    const target =
      abs(file.path);

    const source =
      join(
        backupRoot,
        file.path,
      );

    if (file.existed) {
      mkdirSync(
        dirname(target),
        {
          recursive: true,
        },
      );

      copyFileSync(
        source,
        target,
      );
    } else if (
      existsSync(target)
    ) {
      rmSync(
        target,
        {
          force: true,
        },
      );
    }
  }
}

function latestBackup() {
  const root =
    abs(
      ".humanet-composite-print-layout-backup",
    );

  assert(
    existsSync(root),
    "Nie znaleziono backupu.",
  );

  const dirs =
    readdirSync(root)
      .map(
        (name) =>
          join(
            root,
            name,
          ),
      )
      .filter(
        (path) =>
          statSync(path)
            .isDirectory(),
      )
      .sort()
      .reverse();

  assert(
    dirs.length > 0,
    "Nie znaleziono backupu.",
  );

  return dirs[0];
}

function applyPatch() {
  const newPagePath =
    abs(NEW_PAGE);

  mkdirSync(
    dirname(newPagePath),
    {
      recursive: true,
    },
  );

  /**
   * URL pozostaje dokładnie ten sam.
   * Route groups (protected)/(print) nie wchodzą do URL.
   *
   * Najpierw usuwamy route.ts, żeby nie istniały
   * dwa handlery pod tym samym adresem.
   */
  rmSync(
    abs(OLD_ROUTE),
    {
      force: true,
    },
  );

  copyFileSync(
    REPLACEMENT_PAGE,
    newPagePath,
  );
}

function validateInstalledState() {
  assert(
    !existsSync(abs(OLD_ROUTE)),
    "Stary raw HTML route.ts nadal istnieje.",
  );

  assert(
    existsSync(abs(NEW_PAGE)),
    "Brakuje nowej strony composite w route group (print).",
  );

  const page =
    readFileSync(
      abs(NEW_PAGE),
      "utf8",
    );

  assert(
    page.includes(
      "getMyPersonalCompositeReportByGrantForCurrentUser",
    ),
    "Nowa strona nie zachowała user-safe query.",
  );

  assert(
    page.includes(
      'className="report-print-root"',
    ),
    "Nowa strona nie używa struktury standardowego wydruku.",
  );

  assert(
    page.includes(
      "dangerouslySetInnerHTML",
    ),
    "Nowa strona nie renderuje dokumentu tak jak standardowy raport.",
  );

  const renderer =
    readFileSync(
      abs(RENDERER),
      "utf8",
    );

  assert(
    renderer.includes(
      "renderReportPdfFromUrl",
    ),
    "Wspólny renderer został nieoczekiwanie zmieniony.",
  );
}

function apply() {
  validateRepository();
  validatePrerequisites();

  const backup =
    createBackup();

  console.log(
    `Backup: ${relative(
      ROOT,
      backup,
    )}`,
  );

  try {
    applyPatch();
    validateInstalledState();

    console.log(
      [
        "\nZastosowano poprawkę.",
        "Composite /print działa teraz jako page.tsx w (print),",
        "tak samo jak standardowy raport.",
      ].join(" "),
    );

    console.log(
      "Nie zmieniono render-report-pdf.ts, endpointu PDF, .next ani konfiguracji env.",
    );
  } catch (error) {
    console.error(
      "\nBłąd. Przywracam poprzedni routing composite /print.",
    );

    restoreBackup(
      backup,
    );

    throw error;
  }
}

function check() {
  validateRepository();
  validateInstalledState();

  console.log(
    "OK: composite używa tego samego modelu strony /print co standardowy raport.",
  );
}

function rollback() {
  validateRepository();

  const backup =
    latestBackup();

  restoreBackup(
    backup,
  );

  console.log(
    `Przywrócono backup: ${relative(
      ROOT,
      backup,
    )}`,
  );
}

const args =
  new Set(
    process.argv.slice(2),
  );

try {
  if (args.has("--apply")) {
    apply();
  } else if (
    args.has("--check")
  ) {
    check();
  } else if (
    args.has("--rollback")
  ) {
    rollback();
  } else {
    console.log(`
HUMANET VALUES — composite print same as standard

Zastosowanie:
  node humanet-values-composite-print-like-standard/apply.mjs --apply

Sprawdzenie:
  node humanet-values-composite-print-like-standard/apply.mjs --check

Rollback:
  node humanet-values-composite-print-like-standard/apply.mjs --rollback

Skrypt NIE zmienia:
  features/report-builder/lib/render-report-pdf.ts
  app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts
  .next
  .env*
  Git
`.trim());
  }
} catch (error) {
  console.error(
    `\nBłąd: ${
      error instanceof Error
        ? error.message
        : String(error)
    }`,
  );

  process.exitCode = 1;
}
