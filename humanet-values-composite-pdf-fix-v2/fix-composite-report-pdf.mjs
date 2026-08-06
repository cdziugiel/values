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

import {
  execFileSync,
} from "node:child_process";

const SCRIPT_DIR =
  dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const ROOT = process.cwd();

const TARGETS = {
  renderer:
    "features/report-builder/lib/render-report-pdf.ts",

  compositePdfRoute:
    "app/(protected)/my/reports/composite/grants/[grantId]/pdf/route.ts",
};

const REPLACEMENTS = {
  renderer:
    join(
      SCRIPT_DIR,
      "replacements",
      "render-report-pdf.ts",
    ),

  compositePdfRoute:
    join(
      SCRIPT_DIR,
      "replacements",
      "composite-pdf-route.ts",
    ),
};

function absolute(path) {
  return resolve(ROOT, path);
}

function read(path) {
  return readFileSync(
    absolute(path),
    "utf8",
  );
}

function assert(
  condition,
  message,
) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateRepository() {
  const packagePath =
    absolute("package.json");

  assert(
    existsSync(packagePath),
    "Uruchom skrypt w katalogu głównym repozytorium.",
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
    [
      "Nieoczekiwany projekt:",
      packageJson.name ??
        "brak nazwy",
    ].join(" "),
  );
}

function validateCurrentState() {
  for (
    const path of
    Object.values(TARGETS)
  ) {
    assert(
      existsSync(
        absolute(path),
      ),
      `Brakuje pliku ${path}.`,
    );
  }

  const renderer =
    read(TARGETS.renderer);

  assert(
    renderer.includes(
      "renderReportPdfFromUrl",
    ),
    "Nie rozpoznano renderera PDF.",
  );

  const compositeRoute =
    read(
      TARGETS.compositePdfRoute,
    );

  const isOldVersion =
    compositeRoute.includes(
      "renderReportPdfFromUrl",
    );

  const isNewVersion =
    compositeRoute.includes(
      "renderReportPdfFromHtml",
    );

  assert(
    isOldVersion ||
      isNewVersion,
    "Nie rozpoznano endpointu PDF raportu composite.",
  );
}

function validateInstalledState() {
  const renderer =
    read(TARGETS.renderer);

  assert(
    renderer.includes(
      'waitUntil:\n            "domcontentloaded"',
    ) ||
      renderer.includes(
        'waitUntil: "domcontentloaded"',
      ),
    "Renderer nadal używa niewłaściwego warunku nawigacji.",
  );

  assert(
    !renderer.includes(
      'waitUntil: "networkidle"',
    ),
    "Renderer nadal używa networkidle.",
  );

  assert(
    renderer.includes(
      "renderReportPdfFromHtml",
    ),
    "Brakuje renderowania PDF bezpośrednio z HTML.",
  );

  assert(
    renderer.includes(
      "document.fonts.ready",
    ) &&
      renderer.includes(
        "document.images",
      ) &&
      renderer.includes(
        "MutationObserver",
      ),
    "Brakuje oczekiwania na gotowość zawartości raportu.",
  );

  const compositeRoute =
    read(
      TARGETS.compositePdfRoute,
    );

  assert(
    compositeRoute.includes(
      "renderReportPdfFromHtml",
    ),
    "Endpoint composite nie renderuje bezpośrednio z HTML.",
  );

  assert(
    !compositeRoute.includes(
      "renderReportPdfFromUrl",
    ),
    "Endpoint composite nadal otwiera własną trasę /print.",
  );

  assert(
    compositeRoute.includes(
      "Promise.all",
    ) &&
      compositeRoute.includes(
        "renderReportDocument",
      ),
    "Endpoint composite nie pobiera i nie renderuje raportu w jednym przebiegu.",
  );

  assert(
    !compositeRoute.includes(
      "printUrl",
    ),
    "Endpoint composite nadal tworzy URL drugiego renderowania.",
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
    absolute(
      join(
        ".humanet-composite-pdf-fix-backup",
        timestamp(),
      ),
    );

  mkdirSync(
    backupRoot,
    {
      recursive: true,
    },
  );

  const manifest = {
    createdAt:
      new Date().toISOString(),
    files: [],
  };

  for (
    const path of
    Object.values(TARGETS)
  ) {
    const source =
      absolute(path);

    const destination =
      join(
        backupRoot,
        path,
      );

    manifest.files.push({
      path,
      existed:
        existsSync(source),
    });

    if (
      !existsSync(source)
    ) {
      continue;
    }

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

function restoreBackup(
  backupRoot,
) {
  const manifestPath =
    join(
      backupRoot,
      "manifest.json",
    );

  assert(
    existsSync(manifestPath),
    `Brakuje manifestu: ${manifestPath}`,
  );

  const manifest =
    JSON.parse(
      readFileSync(
        manifestPath,
        "utf8",
      ),
    );

  for (
    const file of
    manifest.files
  ) {
    const target =
      absolute(file.path);

    const backup =
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
        backup,
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
    absolute(
      ".humanet-composite-pdf-fix-backup",
    );

  assert(
    existsSync(root),
    "Nie znaleziono katalogu backupów.",
  );

  const directories =
    readdirSync(root)
      .map(
        (name) =>
          join(root, name),
      )
      .filter(
        (path) =>
          statSync(path)
            .isDirectory(),
      )
      .sort()
      .reverse();

  assert(
    directories.length > 0,
    "Nie znaleziono backupu do przywrócenia.",
  );

  return directories[0];
}

function installFiles() {
  const writes = [
    [
      REPLACEMENTS.renderer,
      TARGETS.renderer,
    ],
    [
      REPLACEMENTS
        .compositePdfRoute,
      TARGETS
        .compositePdfRoute,
    ],
  ];

  for (
    const [
      source,
      targetPath,
    ] of writes
  ) {
    assert(
      existsSync(source),
      `Brakuje pliku poprawki: ${source}`,
    );

    const target =
      absolute(targetPath);

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
  }
}

function clearNextCache() {
  const nextPath =
    absolute(".next");

  if (
    existsSync(nextPath)
  ) {
    console.log(
      "\nUsuwam przestarzały cache .next...",
    );

    rmSync(
      nextPath,
      {
        recursive: true,
        force: true,
      },
    );
  }
}

function run(
  command,
  args,
) {
  console.log(
    `\n> ${command} ${args.join(" ")}`,
  );

  execFileSync(
    command,
    args,
    {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    },
  );
}

function apply({
  withTests,
  withBuild,
  skipTypecheck,
}) {
  validateRepository();
  validateCurrentState();

  const backupRoot =
    createBackup();

  console.log(
    `Backup: ${relative(
      ROOT,
      backupRoot,
    )}`,
  );

  try {
    installFiles();
    validateInstalledState();

    /**
     * Błędy validator.ts zgłoszone przy pierwszej paczce
     * pochodziły z wygenerowanych plików .next, które nadal
     * wskazywały na usunięte trasy. Cache nie jest kodem
     * aplikacji i powinien zostać wygenerowany ponownie.
     */
    clearNextCache();

    if (!skipTypecheck) {
      run(
        "npx",
        [
          "tsc",
          "--noEmit",
        ],
      );
    }

    if (withTests) {
      run(
        "npm",
        ["test"],
      );
    }

    if (withBuild) {
      run(
        "npm",
        [
          "run",
          "build",
        ],
      );
    }

    console.log(
      [
        "\nPoprawka PDF composite",
        "została zainstalowana",
        "i zweryfikowana.",
      ].join(" "),
    );
  } catch (error) {
    console.error(
      [
        "\nInstalacja nie powiodła się.",
        "Przywracam poprzedni kod.",
      ].join(" "),
    );

    restoreBackup(
      backupRoot,
    );

    throw error;
  }
}

function check() {
  validateRepository();
  validateInstalledState();

  console.log(
    "Poprawka jest zainstalowana poprawnie.",
  );
}

function rollback() {
  validateRepository();

  const backupRoot =
    latestBackup();

  restoreBackup(
    backupRoot,
  );

  clearNextCache();

  console.log(
    `Przywrócono backup: ${relative(
      ROOT,
      backupRoot,
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
    apply({
      withTests:
        args.has(
          "--with-tests",
        ),

      withBuild:
        args.has(
          "--with-build",
        ),

      skipTypecheck:
        args.has(
          "--skip-typecheck",
        ),
    });
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
Użycie:
  node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --apply
  node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --apply --with-tests
  node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --apply --with-tests --with-build
  node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --check
  node humanet-values-composite-pdf-fix-v2/fix-composite-report-pdf.mjs --rollback

Opcjonalnie:
  --skip-typecheck
    Pomija npx tsc --noEmit.
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
