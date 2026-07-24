import { chromium } from "playwright";

type RenderSanitizedReportPreviewInput = {
  html: string;
};

const SAFE_DATA_ATTRIBUTES = new Set([
  "data-report-render-mode",
  "data-report-page-id",
  "data-report-page-code",
  "data-report-auto-dynamic",
  "data-report-slot",
  "data-report-generated-header",
  "data-report-generated-footer",
  "data-page-number",
]);

export async function renderSanitizedReportPreviewHtml({
  html,
}: RenderSanitizedReportPreviewInput) {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      viewport: {
        width: 794,
        height: 1123,
      },
      deviceScaleFactor: 1,
    });

    /**
     * Pełny raport trafia wyłącznie do serwerowego Playwrighta.
     * Nie jest jeszcze wysyłany do przeglądarki użytkownika.
     */
    await page.setContent(html, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    /**
     * Czekamy, aż globalJs:
     * - wyliczy interpretacje,
     * - wstawi teksty,
     * - oznaczy dynamiczne elementy.
     */
    await page
      .waitForFunction(
        () =>
          document.documentElement.getAttribute(
            "data-report-auto-masking-ready",
          ) === "true",
        undefined,
        {
          timeout: 10_000,
        },
      )
      .catch(() => {
        /**
         * Nie przerywamy dla szablonów, które nie mają
         * automatycznego trackera.
         */
      });

    await page.evaluate(async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }
    });

    const sanitizedHtml = await page.evaluate(
      ({ safeDataAttributes }) => {
        const safeAttributes = new Set(
          safeDataAttributes,
        );

        const dynamicSelector = [
          '[data-report-auto-dynamic="true"]',
          "[data-report-dynamic]",
          ".report-dynamic-content",
        ].join(",");

        /**
         * Fizycznie usuwamy dynamiczne teksty.
         *
         * Po tej operacji tekst nie istnieje już w DOM.
         * CSS nadal może pokazać neutralny placeholder.
         */
/**
 * Podczas pomiaru wyłączamy wizualne maskowanie z renderera.
 * Inaczej min-height: 10mm/14mm i pseudo-elementy zawyżają
 * rzeczywistą wysokość dynamicznej treści.
 */
document.documentElement.setAttribute(
  "data-report-sanitizing-measure",
  "true",
);

const measurementStyle =
  document.createElement("style");

measurementStyle.setAttribute(
  "data-report-sanitizing-style",
  "true",
);

measurementStyle.textContent = `
html[data-report-sanitizing-measure="true"]
  [data-report-auto-dynamic="true"],
html[data-report-sanitizing-measure="true"]
  [data-report-dynamic],
html[data-report-sanitizing-measure="true"]
  .report-dynamic-content {
  min-height: 0 !important;
  min-width: 0 !important;
  height: auto !important;
  width: auto !important;
  color: inherit !important;
  background: transparent !important;
  filter: none !important;
  opacity: 1 !important;
  overflow: visible !important;
}

html[data-report-sanitizing-measure="true"]
  [data-report-auto-dynamic="true"]::before,
html[data-report-sanitizing-measure="true"]
  [data-report-auto-dynamic="true"]::after,
html[data-report-sanitizing-measure="true"]
  [data-report-dynamic]::before,
html[data-report-sanitizing-measure="true"]
  [data-report-dynamic]::after,
html[data-report-sanitizing-measure="true"]
  .report-dynamic-content::before,
html[data-report-sanitizing-measure="true"]
  .report-dynamic-content::after {
  display: none !important;
  content: none !important;
}
`;

document.head.appendChild(measurementStyle);

const allDynamicElements = Array.from(
  document.querySelectorAll<HTMLElement>(
    dynamicSelector,
  ),
);

/**
 * Jeżeli z jakiegoś powodu oznaczony został jednocześnie
 * kontener i jego dziecko, pozostawiamy bardziej precyzyjne
 * elementy potomne. Zapobiega to podwójnym skeletonom.
 */
const dynamicElements = allDynamicElements.filter(
  (candidate) =>
    !allDynamicElements.some(
      (otherCandidate) =>
        otherCandidate !== candidate &&
        candidate.contains(otherCandidate),
    ),
);

dynamicElements.forEach((element) => {
  const rect = element.getBoundingClientRect();
  const computedStyle =
    window.getComputedStyle(element);

  const display = computedStyle.display;

  const isInline =
    display === "inline" ||
    display === "inline-block" ||
    display === "inline-flex";

  const fontSize =
    Number.parseFloat(computedStyle.fontSize) || 16;

  const parsedLineHeight =
    Number.parseFloat(computedStyle.lineHeight);

  const effectiveLineHeight = Number.isFinite(
    parsedLineHeight,
  )
    ? parsedLineHeight
    : fontSize * 1.45;

  /**
   * Dla krótkich inline'owych wartości zawsze jedna linia.
   * Dla tekstów blokowych zachowujemy realną liczbę wierszy,
   * ale ograniczamy ją do rozsądnego maksimum.
   */
  const estimatedLines = isInline
    ? 1
    : Math.max(
        1,
        Math.min(
          8,
          Math.round(
            rect.height /
              Math.max(effectiveLineHeight, 1),
          ),
        ),
      );

  const originalWidth = Math.max(
    12,
    Math.ceil(rect.width),
  );

  element.replaceChildren();

  const skeleton =
    document.createElement("span");

  skeleton.className =
    "report-redacted-skeleton";

  skeleton.setAttribute(
    "aria-hidden",
    "true",
  );

  skeleton.setAttribute(
    "data-report-redacted-lines",
    String(estimatedLines),
  );

  if (isInline) {
    skeleton.classList.add(
      "report-redacted-skeleton--inline",
    );

    /**
     * Zachowujemy przybliżoną szerokość krótkiej wartości,
     * ale nie pozwalamy jej zająć całego wiersza.
     */
    skeleton.style.width =
      `${Math.min(originalWidth, 280)}px`;
  } else {
    skeleton.classList.add(
      "report-redacted-skeleton--block",
    );

    skeleton.style.width = "100%";
  }

  for (
    let index = 0;
    index < estimatedLines;
    index += 1
  ) {
    const line =
      document.createElement("span");

    line.className =
      "report-redacted-skeleton-line";

    if (estimatedLines === 1) {
      line.style.width = "100%";
    } else if (index === estimatedLines - 1) {
      line.style.width = "68%";
    } else if (index % 4 === 2) {
      line.style.width = "88%";
    } else {
      line.style.width = "100%";
    }

    skeleton.appendChild(line);
  }

  element.appendChild(skeleton);

  /**
   * Nie ustawiamy już:
   * - width: 100% na samym elemencie,
   * - minWidth według pełnej kolumny,
   * - minHeight według rozmiaru z maskującym CSS-em.
   */
  element.style.removeProperty("min-width");
  element.style.removeProperty("min-height");
  element.style.removeProperty("width");
  element.style.removeProperty("height");

  element.setAttribute(
    "data-report-auto-dynamic",
    "true",
  );

  element.removeAttribute(
    "data-report-dynamic",
  );

  element.removeAttribute(
    "data-dominant-vmeme-code",
  );
});

document.documentElement.removeAttribute(
  "data-report-sanitizing-measure",
);

measurementStyle.remove();
        /**
         * Fizycznie usuwamy wykresy i ich SVG.
         *
         * Dotyczy to także:
         * - wartości w <text>,
         * - aria-label,
         * - ścieżek SVG,
         * - danych przypisanych do elementów wykresu.
         */
        document
          .querySelectorAll<HTMLElement>(
            "[data-report-slot]",
          )
          .forEach((slot) => {
            slot.replaceChildren();
          });

        /**
         * Usuwamy wszystkie skrypty:
         * - window.__REPORT__,
         * - globalJs,
         * - page.js,
         * - konfiguracje osadzone w JS.
         */
        document
          .querySelectorAll("script, noscript")
          .forEach((element) => element.remove());

        /**
         * Usuwamy potencjalnie poufne atrybuty oraz
         * wszystkie handlery zdarzeń.
         */
        document
          .querySelectorAll<HTMLElement>("*")
          .forEach((element) => {
            for (const attribute of Array.from(
              element.attributes,
            )) {
              const name =
                attribute.name.toLowerCase();

              if (name.startsWith("on")) {
                element.removeAttribute(
                  attribute.name,
                );

                continue;
              }

              if (
                name.startsWith("data-") &&
                !safeAttributes.has(name)
              ) {
                element.removeAttribute(
                  attribute.name,
                );

                continue;
              }

              if (
                [
                  "aria-label",
                  "aria-valuenow",
                  "aria-valuetext",
                  "aria-description",
                  "title",
                ].includes(name)
              ) {
                element.removeAttribute(
                  attribute.name,
                );
              }
            }
          });

        /**
         * Dodatkowe usunięcie wszystkich znanych
         * globalnych obiektów raportu.
         */
        const reportWindow = window as typeof window & {
          __REPORT__?: unknown;
          __REPORT_CURRENT_PAGE__?: unknown;
          __REPORT_RENDER_MODE__?: unknown;
        };

        delete reportWindow.__REPORT__;
        delete reportWindow.__REPORT_CURRENT_PAGE__;
        delete reportWindow.__REPORT_RENDER_MODE__;

        document.documentElement.setAttribute(
          "data-report-sanitized",
          "true",
        );

        return (
          "<!doctype html>\n" +
          document.documentElement.outerHTML
        );
      },
      {
        safeDataAttributes: Array.from(
          SAFE_DATA_ATTRIBUTES,
        ),
      },
    );

    return sanitizedHtml;
  } finally {
    await browser?.close();
  }
}