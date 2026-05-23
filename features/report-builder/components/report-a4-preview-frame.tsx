// features/report-builder/components/report-a4-preview-frame.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Maximize2 } from "lucide-react";

import {
  getReportComponentsCss,
  normalizeReportComponentBindings,
  renderReportComponent,
} from "../lib/report-components";
import { buildReportContext } from "../lib/report-context";

type ReportA4PreviewFrameProps = {
  page: any;
  reportTemplateVersion: any;
  pageSizeClass: string;
};

const A4_PORTRAIT = {
  width: 794 + 48, // szerokość strony + body padding 24px z obu stron iframe
  height: 1123 + 48,
};

const A4_LANDSCAPE = {
  width: 1123 + 48,
  height: 794 + 48,
};

function getPreviewFrameSize(pageSizeClass: string) {
  if (pageSizeClass.includes("landscape")) {
    return A4_LANDSCAPE;
  }

  return A4_PORTRAIT;
}

function escapeClosingScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderPreviewComponentBindings({
  html,
  page,
  context,
}: {
  html: string;
  page: any;
  context: ReturnType<typeof buildReportContext>;
}) {
  const bindings = normalizeReportComponentBindings(page.componentBindings);

  return bindings.reduce((currentHtml, binding) => {
    const renderedComponent = renderReportComponent({ binding, context });

    const slotPattern = new RegExp(
      `<([a-zA-Z][\\w:-]*)\\b([^>]*?)data-report-slot=["']${escapeRegExp(
        binding.slot,
      )}["']([^>]*)>([\\s\\S]*?)<\\/\\1>`,
      "g",
    );

    return currentHtml.replace(slotPattern, (_match, tagName, before, after) => {
      return `<${tagName}${before}data-report-slot="${binding.slot}"${after}>${renderedComponent}</${tagName}>`;
    });
  }, html);
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
  const globalCss = `
    ${getReportComponentsCss()}
    ${reportTemplateVersion.globalCss ?? ""}
  `;
  const pageCss = page.css ?? "";

  const globalJs = escapeClosingScript(reportTemplateVersion.globalJs ?? "");
  const pageJs = escapeClosingScript(page.js ?? "");

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

  const context = buildReportContext(reportContext.samplePayload);
  const html = renderPreviewComponentBindings({
    html: page.html ?? "",
    page,
    context,
  });

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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const srcDoc = useMemo(
    () =>
      buildPreviewHtml({
        page,
        reportTemplateVersion,
        pageSizeClass,
      }),
    [page, reportTemplateVersion, pageSizeClass],
  );

  const frameSize = useMemo(
    () => getPreviewFrameSize(pageSizeClass),
    [pageSizeClass],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateScale = () => {
      const availableWidth = viewport.clientWidth;

      const nextScale = Math.min(1, availableWidth / frameSize.width);

      setScale(nextScale);
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [frameSize.width]);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-black/10 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <FileText size={18} />
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#171717]">
              {page.title || "Podgląd strony raportu"}
            </div>

            <div className="mt-0.5 truncate font-mono text-xs text-[#6b7280]">
              {page.code ?? "bez kodu"} · {pageSizeClass}
            </div>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-[#6b7280]">
          <Maximize2 size={13} />
          Preview A4
        </div>
      </div>

      <div className="">
        <div
          ref={viewportRef}
          className="overflow-hidden  bg-white shadow-inner"
        >
          <div
            style={{
              height: frameSize.height * scale,
            }}
          >
            <iframe
              title={`Podgląd strony raportu: ${page.title}`}
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              style={{
                width: frameSize.width,
                height: frameSize.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              className="block border-0 bg-[#f3f4f6]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}