// features/report-builder/lib/report-template-renderer.ts

import {
  buildReportContext,
  type ReportContext,
  type SnapshotPayload,
} from "./report-context";

import type {
  ReportSnapshotPayload,
} from "../types/report-builder.types";
import { evaluateReportPathCondition } from "./report-condition";
import {
  getReportComponentsCss,
  normalizeReportComponentBindings,
  renderReportComponent,
} from "./report-components";

export type ReportRenderMode =
  | "full"
  | "personal_teaser"
  | "sample_redacted";

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
  payload: SnapshotPayload | null | undefined;
  mode?: ReportRenderMode;
  pageCodes?: string[];
  watermark?: string | null;
  showUnlockAction?: boolean;
};

function escapeClosingScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function normalizePageCodes(pageCodes: string[] | undefined) {
  return new Set(
    (pageCodes ?? [])
      .map((pageCode) => String(pageCode ?? "").trim())
      .filter(Boolean),
  );
}

function selectPages({
  pages,
  pageCodes,
  mode,
}: {
  pages: ReportTemplatePage[];
  pageCodes?: string[];
  mode: ReportRenderMode;
}) {
  const sortedPages = sortPages(pages);
  const requestedPageCodes = normalizePageCodes(pageCodes);

  if (mode === "full") {
    return sortedPages;
  }

  if (requestedPageCodes.size > 0) {
    return sortedPages.filter((page) =>
      requestedPageCodes.has(page.code),
    );
  }

  /**
   * Bez jawnej konfiguracji:
   * - teaser pokazuje maksymalnie dwie pierwsze widoczne strony,
   * - sample pokazuje wszystkie strony.
   */
  if (mode === "personal_teaser") {
    return sortedPages.slice(0, 2);
  }

  return sortedPages;
}

function interpolateHtml(html: string, context: ReportContext) {
  return html.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, path) => {
    const value = String(path)
      .split(".")
      .filter(Boolean)
      .reduce<unknown>((acc, key) => {
        if (acc === null || acc === undefined) {
          return undefined;
        }

        if (typeof acc !== "object") {
          return undefined;
        }

        return (acc as Record<string, unknown>)[key];
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

function buildPreviewCss({
  mode,
}: {
  mode: ReportRenderMode;
}) {
  if (mode === "full") {
    return "";
  }

  return `
.report-preview-watermark {
  position: absolute;
  top: 15mm;
  right: -31mm;
  z-index: 100;

  width: 118mm;
  min-height: 12mm;
  padding: 3.2mm 8mm;

  transform: rotate(36deg);
  transform-origin: center;

  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(15, 118, 110, 0.92);
  color: #ffffff;

  font-size: 2.8mm;
  font-weight: 750;
  letter-spacing: 0.12em;
  line-height: 1.15;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;

  pointer-events: none;
}

.report-preview-footer {
  position: absolute;
  right: 12mm;
  bottom: 8mm;
  left: 12mm;
  z-index: 90;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4mm;

  min-height: 10mm;
  padding: 2.5mm 4mm;

  border: 0.25mm solid rgba(15, 118, 110, 0.22);
  border-radius: 3mm;

  background: rgba(240, 253, 250, 0.96);
  color: #115e59;

  font-size: 2.9mm;
  font-weight: 650;
  line-height: 1.35;
}

.report-preview-footer > span {
  min-width: 0;
  flex: 1 1 auto;
  text-align: left;
}

.report-preview-footer-action {
  flex: 0 0 auto;

  min-height: 7mm;
  padding: 1.7mm 3.5mm;

  border: 0;
  border-radius: 999px;

  background: #171717;
  color: #ffffff;

  font: inherit;
  font-size: 2.7mm;
  font-weight: 700;
  line-height: 1;

  cursor: pointer;
  white-space: nowrap;
}

.report-preview-footer-action:hover {
  background: #0f766e;
}

.report-preview-footer-action:focus-visible {
  outline: 0.7mm solid rgba(45, 212, 191, 0.55);
  outline-offset: 0.5mm;
}

${mode === "sample_redacted"
      ? `
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-slot] {
  position: relative !important;
  min-height: 30mm;
  overflow: hidden !important;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-slot] > * {
  visibility: hidden !important;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-slot]::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 20;
  border: 0.3mm solid rgba(15, 118, 110, 0.14);
  border-radius: 3mm;
  background:
    linear-gradient(
      110deg,
      rgba(241, 245, 249, 0.98),
      rgba(226, 232, 240, 0.98)
    );
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-slot]::after {
  content: "Element dostępny w pełnym raporcie";
  position: absolute;
  inset: 0;
  z-index: 21;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6mm;
  color: #64748b;
  font-size: 3.2mm;
  font-weight: 650;
  letter-spacing: 0.02em;
  text-align: center;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic],
.report-document[data-report-render-mode="sample_redacted"]
  .report-dynamic-content {
  position: relative !important;
  min-height: 14mm;
  overflow: hidden !important;
  color: transparent !important;
  user-select: none !important;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic] *,
.report-document[data-report-render-mode="sample_redacted"]
  .report-dynamic-content * {
  visibility: hidden !important;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic]::after,
.report-document[data-report-render-mode="sample_redacted"]
  .report-dynamic-content::after {
  content: "Indywidualna interpretacja dostępna w pełnym raporcie";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding: 3mm 4mm;
  border-radius: 2.5mm;
  background:
    repeating-linear-gradient(
      180deg,
      #e2e8f0 0,
      #e2e8f0 2.4mm,
      transparent 2.4mm,
      transparent 4.5mm
    );
  color: #64748b;
  font-size: 2.8mm;
  font-weight: 600;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"],
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic],
.report-document[data-report-render-mode="sample_redacted"]
  .report-dynamic-content {
  position: relative !important;
  min-height: 10mm;
  overflow: hidden !important;
  isolation: isolate;
  user-select: none !important;
  pointer-events: none !important;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"] > *,
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic] > *,
.report-document[data-report-render-mode="sample_redacted"]
  .report-dynamic-content > * {
  filter: blur(8px) !important;
  opacity: 0.16 !important;
  user-select: none !important;
  pointer-events: none !important;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]::before,
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic]::before,
.report-document[data-report-render-mode="sample_redacted"]
  .report-dynamic-content::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 20;

  border: 0.25mm solid rgba(15, 118, 110, 0.14);
  border-radius: 2.5mm;

  background:
    linear-gradient(
      110deg,
      rgba(248, 250, 252, 0.93),
      rgba(241, 245, 249, 0.96)
    );

  backdrop-filter: blur(6px);
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]::after,
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic]::after,
.report-document[data-report-render-mode="sample_redacted"]
  .report-dynamic-content::after {
  content: "Treść indywidualna dostępna w pełnym raporcie";
  position: absolute;
  inset: 0;
  z-index: 21;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 3mm 4mm;

  color: #64748b;
  font-size: 2.8mm;
  font-weight: 650;
  line-height: 1.35;
  text-align: center;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]:not(:has(*)),
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic]:not(:has(*)) {
  min-width: 18mm;
  min-height: 5mm;
  color: transparent !important;
  border-radius: 1.5mm;
  background:
    repeating-linear-gradient(
      180deg,
      #dce3ea 0,
      #dce3ea 2.2mm,
      transparent 2.2mm,
      transparent 4mm
    ) !important;
}

.report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]:not(:has(*))::before,
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]:not(:has(*))::after,
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic]:not(:has(*))::before,
.report-document[data-report-render-mode="sample_redacted"]
  [data-report-dynamic]:not(:has(*))::after {
  display: none !important;
}
`
      : ""
    }
`.trim();
}

function buildBaseCss({
  reportTemplateVersion,
  mode,
}: {
  reportTemplateVersion: ReportTemplateVersion;
  mode: ReportRenderMode;
}) {
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

@page {
  size: A4 portrait;
  margin: 0;
}
.report-document[data-report-render-mode="sample_redacted"]
  .report-redacted-skeleton {
  box-sizing: border-box;
  vertical-align: middle;
  user-select: none;
  pointer-events: none;
}

.report-document[data-report-render-mode="sample_redacted"]
  .report-redacted-skeleton--block {
  display: flex;
  flex-direction: column;
  gap: 0.52em;
  width: 100%;
  padding: 0.12em 0;
}

.report-document[data-report-render-mode="sample_redacted"]
  .report-redacted-skeleton--inline {
  display: inline-flex;
  max-width: min(100%, 280px);
  vertical-align: baseline;
}

.report-document[data-report-render-mode="sample_redacted"]
  .report-redacted-skeleton-line {
  display: block;
  flex: 0 0 auto;
  height: 0.62em;
  max-width: 100%;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      #dbe3ea 0%,
      #e8edf2 55%,
      #dbe3ea 100%
    );
}

.report-document[data-report-render-mode="sample_redacted"]
  .report-redacted-skeleton--inline
  .report-redacted-skeleton-line {
  width: 100%;
}
@media print {
  html,
  body {
    width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  body {
    overflow: visible !important;
  }

  .report-document {
    display: block !important;
    width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    gap: 0 !important;
  }

  .report-page {
    display: block !important;
    position: relative !important;

    width: 210mm !important;
    min-width: 210mm !important;
    max-width: 210mm !important;

    height: 297mm !important;
    min-height: 297mm !important;
    max-height: 297mm !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: hidden !important;
    box-shadow: none !important;

    break-before: auto;
    break-after: page;
    break-inside: avoid-page;

    page-break-before: auto;
    page-break-after: always;
    page-break-inside: avoid;
  }

  .report-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
    
}
  html[data-report-sanitized="true"]
  .report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]::before,
html[data-report-sanitized="true"]
  .report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]::after {
  display: none !important;
  content: none !important;
}

html[data-report-sanitized="true"]
  .report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"] {
  min-height: 0 !important;
  min-width: 0 !important;
  background: transparent !important;
  color: inherit !important;
  overflow: visible !important;
  isolation: auto !important;
}

html[data-report-sanitized="true"]
  .report-document[data-report-render-mode="sample_redacted"]
  [data-report-auto-dynamic="true"]
  > .report-redacted-skeleton {
  filter: none !important;
  opacity: 1 !important;
  visibility: visible !important;
}
${getReportComponentsCss()}

${reportTemplateVersion.globalCss ?? ""}

${buildPreviewCss({ mode })}
`.trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderComponentBindings({
  html,
  page,
  context,
}: {
  html: string;
  page: ReportTemplatePage;
  context: ReportContext;
}) {
  const bindings = normalizeReportComponentBindings(
    page.componentBindings,
  );

  return bindings.reduce((currentHtml, binding) => {
    const renderedComponent = renderReportComponent({
      binding,
      context,
    });

    const slotPattern = new RegExp(
      `<([a-zA-Z][\\w:-]*)\\b([^>]*?)data-report-slot=["']${escapeRegExp(
        binding.slot,
      )}["']([^>]*)>([\\s\\S]*?)<\\/\\1>`,
      "g",
    );

    return currentHtml.replace(
      slotPattern,
      (_match, tagName, before, after) => {
        return `<${tagName}${before}data-report-slot="${binding.slot}"${after}>${renderedComponent}</${tagName}>`;
      },
    );
  }, html);
}

function buildPreviewWatermark(watermark: string | null) {
  if (!watermark) {
    return "";
  }

  return `
<div class="report-preview-watermark">
  ${escapeHtml(watermark)}
</div>
`.trim();
}

function buildPreviewFooter({
  mode,
  showUnlockAction,
}: {
  mode: ReportRenderMode;
  showUnlockAction: boolean;
}) {
  if (mode === "full") {
    return "";
  }

  if (mode === "personal_teaser") {
    return `
<div class="report-preview-footer">
  <span>
    To jest bezpłatny skrót wyniku. Pełna interpretacja i rekomendacje
    znajdują się w pełnym raporcie.
  </span>

  ${showUnlockAction
        ? `
        <button
          type="button"
          class="report-preview-footer-action"
          data-report-unlock-action="true"
        >
          Odblokuj pełny raport
        </button>
      `
        : ""
      }
</div>
`.trim();
  }

  return `
<div class="report-preview-footer">
  To jest przykładowa wersja raportu. Wyniki, wykresy i interpretacje
  indywidualne zostały ukryte.
</div>
`.trim();
}


function buildAutomaticDynamicContentTrackerScript({
  mode,
  globalJs,
}: {
  mode: ReportRenderMode;
  globalJs: string;
}) {
  const escapedGlobalJs = escapeClosingScript(globalJs);

  if (mode !== "sample_redacted") {
    return `
try {
  ${escapedGlobalJs}
} catch (error) {
  console.error("Report global JS error:", error);
}
`.trim();
  }

  return `
(() => {
  const dynamicCandidates = new Set();
  let finalized = false;

  const isElement = (value) =>
    value instanceof Element;

  const isTextNode = (value) =>
    value instanceof Text;

  const getElement = (value) => {
    if (isElement(value)) {
      return value;
    }

    if (isTextNode(value)) {
      return value.parentElement;
    }

    return value?.parentElement ?? null;
  };

  const isGeneratedReportChrome = (node) => {
    const element = getElement(node);

    if (!element) {
      return false;
    }

    return Boolean(
      element.closest(
        [
          "[data-report-generated-header='true']",
          "[data-report-generated-footer='true']",
          ".report-preview-watermark",
          ".report-preview-footer",
        ].join(",")
      )
    );
  };

  const isExplicitlyVisible = (element) => {
    if (!element) {
      return false;
    }

    return Boolean(
      element.matches("[data-report-preview-visible]") ||
      element.closest("[data-report-preview-visible]")
    );
  };

  const shouldIgnoreElement = (element) => {
    if (!element) {
      return true;
    }

    if (isGeneratedReportChrome(element)) {
      return true;
    }

    if (isExplicitlyVisible(element)) {
      return true;
    }

    if (
      element.matches(
        [
          "html",
          "body",
          ".report-document",
          ".report-page",
          ".hr-page",
          ".hr-page-inner",
          ".report-page-content",
        ].join(",")
      )
    ) {
      return true;
    }

    return false;
  };

  const addCandidate = (element) => {
    if (!isElement(element)) {
      return;
    }

    if (shouldIgnoreElement(element)) {
      return;
    }

    /**
     * Elementy wewnątrz wykresów są maskowane przez
     * nadrzędny data-report-slot. Nie oznaczamy ich ponownie.
     */
    if (element.closest("[data-report-slot]")) {
      return;
    }

    dynamicCandidates.add(element);
  };

  const processMutations = (mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        const parent = mutation.target.parentElement;

        if (
          parent &&
          !isGeneratedReportChrome(parent) &&
          !isExplicitlyVisible(parent)
        ) {
          addCandidate(parent);
        }

        return;
      }

      if (mutation.type !== "childList") {
        return;
      }

      const target = getElement(mutation.target);

      if (!target || shouldIgnoreElement(target)) {
        return;
      }

      const hasRelevantAddedNodes = Array.from(
        mutation.addedNodes
      ).some((node) => {
        if (isGeneratedReportChrome(node)) {
          return false;
        }

        if (isTextNode(node)) {
          return Boolean(node.textContent?.trim());
        }

        return isElement(node);
      });

      const hasRelevantRemovedNodes = Array.from(
        mutation.removedNodes
      ).some((node) => {
        return !isGeneratedReportChrome(node);
      });

      if (
        hasRelevantAddedNodes ||
        hasRelevantRemovedNodes
      ) {
        addCandidate(target);
      }
    });
  };

  const observer = new MutationObserver(
    processMutations
  );

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  const finalizeDynamicMasking = () => {
    if (finalized) {
      return;
    }

    finalized = true;

    /**
     * Najważniejsza część poprawki:
     * pobieramy niewysłane jeszcze rekordy mutacji,
     * zanim wyłączymy observer.
     */
    const pendingMutations = observer.takeRecords();

    if (pendingMutations.length > 0) {
      processMutations(pendingMutations);
    }

    observer.disconnect();

    const candidates = Array.from(
      dynamicCandidates
    );

    /**
     * Zachowujemy możliwie najbardziej precyzyjne
     * elementy potomne. Nie maskujemy całego kontenera,
     * jeśli zmienione zostało tylko jego dziecko.
     */
    const normalizedCandidates = candidates.filter(
      (candidate) => {
        return !candidates.some(
          (otherCandidate) =>
            otherCandidate !== candidate &&
            candidate.contains(otherCandidate)
        );
      }
    );

    normalizedCandidates.forEach((element) => {
      element.setAttribute(
        "data-report-auto-dynamic",
        "true"
      );
    });

    document.documentElement.setAttribute(
      "data-report-auto-masking-ready",
      "true"
    );

    /**
     * Dane są czyszczone dopiero po wygenerowaniu
     * dynamicznych treści.
     */
    window.__REPORT__ = {
      preview: {
        isSample: true,
        isRedacted: true,
      },
    };

    window.__REPORT_CURRENT_PAGE__ = null;
  };

  try {
    ${escapedGlobalJs}
  } catch (error) {
    console.error("Report global JS error:", error);
  }

  /**
   * MutationObserver przekazuje callback w kolejce
   * mikro-zadań. Nie wolno odłączać go bezpośrednio
   * w finally.
   */
  queueMicrotask(() => {
    finalizeDynamicMasking();
  });

  /**
   * Zabezpieczenie dla mutacji wykonanych przez Promise
   * lub inne operacje kończące się w następnym cyklu.
   */
  setTimeout(() => {
    finalizeDynamicMasking();
  }, 0);
})();
`.trim();
}

export function renderReportDocument({
  reportTemplateVersion,
  payload,
  mode = "full",
  pageCodes,
  watermark = null,
  showUnlockAction = false,
}: RenderReportInput) {
  const context = buildReportContext(payload);
  const pageClass = getPageClass(reportTemplateVersion);

  const conditionallyVisiblePages = sortPages(
    reportTemplateVersion.pages ?? [],
  ).filter((page) =>
    evaluateReportPathCondition(
      page.visibilityCondition as never,
      context,
    ),
  );

  const visiblePages = selectPages({
    pages: conditionallyVisiblePages,
    pageCodes,
    mode,
  });

  const pageHtml = visiblePages
    .map((page, index) => {
      const interpolatedHtml = interpolateHtml(
        page.html ?? "",
        context,
      );

      const html = renderComponentBindings({
        html: interpolatedHtml,
        page,
        context,
      });

      const isLastPage = index === visiblePages.length - 1;

      return `
<section
  class="report-page ${pageClass}"
  data-report-page-id="${escapeHtml(page.id)}"
  data-report-page-code="${escapeHtml(page.code)}"
>
  ${buildPreviewWatermark(watermark)}
  ${html}
  ${isLastPage ? buildPreviewFooter({
      mode,
      showUnlockAction,
    }) : ""}
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
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <title>${escapeHtml(reportTemplateVersion.name)}</title>

  <style>
    ${buildBaseCss({
    reportTemplateVersion,
    mode,
  })}
  </style>
</head>

<body>
  <script>
window.__REPORT__ = ${escapeClosingScript(
    JSON.stringify(context),
  )};

    window.__REPORT_RENDER_MODE__ = ${JSON.stringify(mode)};
  </script>

  <div
    class="report-document"
    data-report-render-mode="${mode}"
  >
    ${pageHtml}
  </div>

<script>
  ${buildAutomaticDynamicContentTrackerScript({
    mode,
    globalJs: reportTemplateVersion.globalJs ?? "",
  })}
</script>
</body>
</html>
`.trim();

  return {
    html: documentHtml,
    context,
    visiblePages,
    mode,
  };
}