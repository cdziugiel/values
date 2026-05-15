// features/report-builder/lib/report-template-renderer.ts

import { buildReportContext, type ReportContext } from "./report-context";
import { evaluateReportPathCondition } from "./report-condition";

type ReportTemplatePage = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  html?: string | null;
  css?: string | null;
  js?: string | null;
  visibilityCondition?: unknown | null;
  componentBindings?: unknown | null;
  config?: unknown | null;
};

type ReportTemplateVersion = {
  id: string;
  name: string;
  version: string;
  pageSize?: string | null;
  orientation?: string | null;
  globalCss?: string | null;
  globalJs?: string | null;
  config?: unknown | null;
  dataBindings?: unknown | null;
  pages: ReportTemplatePage[];
};

type RenderReportInput = {
  reportTemplateVersion: ReportTemplateVersion;
  payload: any;
};

function escapeClosingScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function getPageClass(reportTemplateVersion: ReportTemplateVersion) {
  const pageSize = reportTemplateVersion.pageSize ?? "A4";
  const orientation = reportTemplateVersion.orientation ?? "portrait";

  return `${pageSize} ${orientation}`;
}

function sortPages(pages: ReportTemplatePage[]) {
  return [...pages].sort(
    (a, b) =>
      (a.orderIndex ?? 0) - (b.orderIndex ?? 0) ||
      a.title.localeCompare(b.title, "pl", {
        sensitivity: "base",
        numeric: true,
      }),
  );
}

function interpolateHtml(html: string, context: ReportContext) {
  return html.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, path) => {
    const value = String(path)
      .split(".")
      .filter(Boolean)
      .reduce<any>((acc, key) => {
        if (acc === null || acc === undefined) {
          return undefined;
        }

        return acc[key];
      }, context);

    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

function buildBaseCss(reportTemplateVersion: ReportTemplateVersion) {
  return `
:root {
  --page-bg: #ffffff;
  --page-fg: #111827;
  --muted: #6b7280;
  --border: #e5e7eb;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: #f3f4f6;
  color: var(--page-fg);
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  padding: 24px;
}

.report-document {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.report-page {
  background: var(--page-bg);
  color: var(--page-fg);
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
}

.report-page.A4.portrait {
  width: 794px;
  min-height: 1123px;
}

.report-page.A4.landscape {
  width: 1123px;
  min-height: 794px;
}

.report-page-content {
  padding: 48px;
}

.report-slot {
  min-height: 80px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 16px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
}

@media print {
  body {
    padding: 0;
    background: #fff;
  }

  .report-document {
    gap: 0;
  }

  .report-page {
    box-shadow: none;
    page-break-after: always;
  }
}

${reportTemplateVersion.globalCss ?? ""}
`.trim();
}

export function renderReportDocument({
  reportTemplateVersion,
  payload,
}: RenderReportInput) {
  const context = buildReportContext(payload);
  const pageClass = getPageClass(reportTemplateVersion);

  const visiblePages = sortPages(reportTemplateVersion.pages ?? []).filter(
    (page) => evaluateReportPathCondition(page.visibilityCondition as any, context),
  );

  const pageHtml = visiblePages
    .map((page) => {
      const html = interpolateHtml(page.html ?? "", context);

      return `
<section class="report-page ${pageClass}" data-report-page-id="${page.id}" data-report-page-code="${page.code}">
  ${html}
</section>
<style>
${page.css ?? ""}
</style>
<script>
try {
  window.__REPORT_CURRENT_PAGE__ = ${escapeClosingScript(
    JSON.stringify({
      id: page.id,
      code: page.code,
      title: page.title,
      config: page.config ?? {},
      componentBindings: page.componentBindings ?? [],
    }),
  )};

  ${escapeClosingScript(page.js ?? "")}
} catch (error) {
  console.error("Report page JS error:", error);
}
</script>
`.trim();
    })
    .join("\n\n");

  const documentHtml = `
<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>${reportTemplateVersion.name}</title>

  <style>
    ${buildBaseCss(reportTemplateVersion)}
  </style>
</head>

<body>
  <div class="report-document">
    ${pageHtml}
  </div>

  <script>
    window.__REPORT__ = ${escapeClosingScript(JSON.stringify(context))};
  </script>

  <script>
    try {
      ${escapeClosingScript(reportTemplateVersion.globalJs ?? "")}
    } catch (error) {
      console.error("Report global JS error:", error);
    }
  </script>
</body>
</html>
`.trim();

  return {
    html: documentHtml,
    context,
    visiblePages,
  };
}