// features/report-builder/components/report-a4-preview-frame.tsx
"use client";

import { useMemo } from "react";

type ReportA4PreviewFrameProps = {
  page: any;
  reportTemplateVersion: any;
  pageSizeClass: string;
};

function escapeClosingScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function buildPreviewHtml({
  page,
  reportTemplateVersion,
  pageSizeClass,
}: {
  page: any;
  reportTemplateVersion: any;
  pageSizeClass: string;
}) {
  const globalCss = reportTemplateVersion.globalCss ?? "";
  const pageCss = page.css ?? "";

  const globalJs = escapeClosingScript(reportTemplateVersion.globalJs ?? "");
  const pageJs = escapeClosingScript(page.js ?? "");

  const html = page.html ?? "";

  const reportContext = {
    mode: "builder-preview",
    templateVersion: {
      id: reportTemplateVersion.id,
      name: reportTemplateVersion.name,
      version: reportTemplateVersion.version,
      config: reportTemplateVersion.config ?? {},
      dataBindings: reportTemplateVersion.dataBindings ?? {},
    },
    page: {
      id: page.id,
      code: page.code,
      title: page.title,
      config: page.config ?? {},
      visibilityCondition: page.visibilityCondition ?? null,
      componentBindings: page.componentBindings ?? [],
    },
    samplePayload: {
      project: {
        name: "Przykładowy projekt badawczy",
      },
      scores: [
        {
          dimensionCode: "TRADITION",
          dimensionName: "TRADYCJA",
          dimensionCategory: "vMEME",
          meanScore: 1.4,
          weightedMeanScore: 1.4,
          completeness: 1,
        },
        {
          dimensionCode: "EXPANSION",
          dimensionName: "EKSPANSJA",
          dimensionCategory: "vMEME",
          meanScore: 2.2,
          weightedMeanScore: 2.2,
          completeness: 1,
        },
        {
          dimensionCode: "NEEDS",
          dimensionName: "Potrzeby",
          dimensionCategory: "AREA",
          meanScore: 1.8,
          weightedMeanScore: 1.8,
          completeness: 1,
        },
      ],
    },
  };

  return `
<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <style>
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
      min-height: 100%;
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

    .report-page {
      background: var(--page-bg);
      color: var(--page-fg);
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
      overflow: hidden;
      position: relative;
      margin: 0 auto;
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

    ${globalCss}
    ${pageCss}
  </style>
</head>

<body>
  <div class="report-page ${pageSizeClass}">
    ${html}
  </div>

  <script>
    window.__REPORT__ = ${escapeClosingScript(JSON.stringify(reportContext))};

    window.renderReportSlot = function renderReportSlot(slot, content) {
      const element = document.querySelector('[data-report-slot="' + slot + '"]');

      if (!element) {
        return;
      }

      element.innerHTML = content;
    };
  </script>

  <script>
    try {
      ${globalJs}
    } catch (error) {
      console.error("Global report JS error:", error);
    }
  </script>

  <script>
    try {
      ${pageJs}
    } catch (error) {
      console.error("Page report JS error:", error);
    }
  </script>
</body>
</html>
`.trim();
}

export function ReportA4PreviewFrame({
  page,
  reportTemplateVersion,
  pageSizeClass,
}: ReportA4PreviewFrameProps) {
  const srcDoc = useMemo(
    () =>
      buildPreviewHtml({
        page,
        reportTemplateVersion,
        pageSizeClass,
      }),
    [page, reportTemplateVersion, pageSizeClass],
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/30">
      <iframe
        title={`Podgląd strony raportu: ${page.title}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="h-[720px] w-full bg-muted"
      />
    </div>
  );
}