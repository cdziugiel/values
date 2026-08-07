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

const SCRIPT_DIR =
  dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const ROOT =
  process.cwd();

const TARGETS = {
  pdf:
    "app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts",

  print:
    "app/(protected)/my/reports/composite/grants/[grantId]/print/route.ts",

  safeQuery:
    "features/report-access/api/my-composite-report.queries.ts",

  renderer:
    "features/report-builder/lib/render-report-pdf.ts",
};

const REPLACEMENTS = {
  pdf:
    join(
      SCRIPT_DIR,
      "replacements",
      "composite-pdf-route.ts",
    ),

  print:
    join(
      SCRIPT_DIR,
      "replacements",
      "composite-print-route.ts",
    ),
};

function abs(path) {
  return resolve(
    ROOT,
    path,
  );
}

function read(path) {
  return readFileSync(
    abs(path),
    "utf8",
  );
}

function assert(
  condition,
  message,
) {
  if (!condition) {
    throw new Error(
      message,
    );
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
    packageJson.name ===
      "humanet-values",
    `Nieoczekiwany projekt: ${packageJson.name ?? "brak nazwy"}.`,
  );
}

function validatePrerequisites() {
  for (
    const path of
    Object.values(TARGETS)
  ) {
    assert(
      existsSync(
        abs(path),
      ),
      `Brakuje pliku: ${path}`,
    );
  }

  const safeQuery =
    read(
      TARGETS.safeQuery,
    );

  assert(
    safeQuery.includes(
      "getMyPersonalCompositeReportByGrantForCurrentUser",
    ),
    "Brakuje user-safe query composite.",
  );

  const renderer =
    read(
      TARGETS.renderer,
    );

  assert(
    renderer.includes(
      "renderReportPdfFromUrl",
    ),
    "Nie rozpoznano wspólnego renderera PDF.",
  );

  for (
    const path of
    Object.values(REPLACEMENTS)
  ) {
    assert(
      existsSync(path),
      `Brakuje pliku poprawki: ${path}`,
    );
  }
}

function timestamp() {
  return new Date()
    .toISOString()
    .replaceAll(
      ":",
      "-",
    )
    .replaceAll(
      ".",
      "-",
    );
}

function createBackup() {
  const root =
    abs(
      join(
        ".humanet-composite-print-auth-backup",
        timestamp(),
      ),
    );

  mkdirSync(
    root,
    {
      recursive: true,
    },
  );

  const files = [
    TARGETS.pdf,
    TARGETS.print,
  ];

  const manifest = {
    createdAt:
      new Date().toISOString(),
    files: [],
  };

  for (
    const path of files
  ) {
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
        root,
        path,
      );

    mkdirSync(
      dirname(
        destination,
      ),
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
      root,
      "manifest.json",
    ),
    JSON.stringify(
      manifest,
      null,
      2,
    ),
    "utf8",
  );

  return root;
}

function restoreBackup(
  backupRoot,
) {
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

  for (
    const file of
    manifest.files
  ) {
    const target =
      abs(file.path);

    const source =
      join(
        backupRoot,
        file.path,
      );

    if (file.existed) {
      mkdirSync(
        dirname(
          target,
        ),
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
      ".humanet-composite-print-auth-backup",
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

function install() {
  mkdirSync(
    dirname(
      abs(
        TARGETS.pdf,
      ),
    ),
    {
      recursive: true,
    },
  );

  mkdirSync(
    dirname(
      abs(
        TARGETS.print,
      ),
    ),
    {
      recursive: true,
    },
  );

  copyFileSync(
    REPLACEMENTS.pdf,
    abs(
      TARGETS.pdf,
    ),
  );

  copyFileSync(
    REPLACEMENTS.print,
    abs(
      TARGETS.print,
    ),
  );
}

function validateInstalledState() {
  const pdf =
    read(
      TARGETS.pdf,
    );

  const print =
    read(
      TARGETS.print,
    );

  assert(
    pdf.includes(
      "getMyPersonalCompositeReportByGrantForCurrentUser",
    ),
    "PDF composite nie używa user-safe query.",
  );

  assert(
    pdf.includes(
      "renderReportPdfFromUrl",
    ),
    "PDF composite nie korzysta ze stabilnego renderera URL.",
  );

  assert(
    !pdf.includes(
      "renderReportPdfFromHtml",
    ),
    "PDF composite nadal renderuje surowy HTML.",
  );

  assert(
    print.includes(
      "getMyPersonalCompositeReportByGrantForCurrentUser",
    ),
    "Print composite nie używa user-safe query.",
  );

  assert(
    !print.includes(
      "getPersonalCompositeReport",
    ),
    "Print composite nadal używa tenant-member query.",
  );

  assert(
    print.includes(
      "renderReportDocument",
    ),
    "Print composite nie renderuje dokumentu raportu.",
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
    install();
    validateInstalledState();

    console.log(
      [
        "\nZastosowano minimalną poprawkę tylko dla composite.",
        "Nie zmieniono render-report-pdf.ts, .next ani żadnego standardowego raportu.",
      ].join(" "),
    );
  } catch (error) {
    console.error(
      "\nBłąd. Przywracam poprzednie dwie trasy composite.",
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
    "OK: minimalna poprawka composite jest zainstalowana.",
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
  if (
    args.has("--apply")
  ) {
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
HUMANET VALUES — minimal composite print auth fix

Zastosowanie:
  node humanet-values-composite-print-auth-fix/fix-composite-print-auth.mjs --apply

Sprawdzenie:
  node humanet-values-composite-print-auth-fix/fix-composite-print-auth.mjs --check

Rollback:
  node humanet-values-composite-print-auth-fix/fix-composite-print-auth.mjs --rollback

Skrypt NIE zmienia:
  features/report-builder/lib/render-report-pdf.ts
  .next
  standardowych raportów
  konfiguracji REPORT_RENDER_BASE_URL
  Git branch/commit/push
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
