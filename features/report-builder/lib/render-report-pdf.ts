import {
  chromium,
  type Page,
} from "playwright";

type RenderReportPdfFromUrlInput = {
  url: string;
  cookieHeader?: string;
};

type RenderReportPdfFromHtmlInput = {
  html: string;
  cookieHeader?: string;
  baseUrl?: string;
};

const NAVIGATION_TIMEOUT_MS = 60_000;
const REPORT_READY_TIMEOUT_MS = 20_000;
const IMAGE_READY_TIMEOUT_MS = 10_000;

const DOM_QUIET_TIME_MS = 220;
const DOM_STABILITY_TIMEOUT_MS = 5_000;

function normalizeBaseUrl(
  value: string | undefined,
) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.endsWith("/")
    ? normalized
    : `${normalized}/`;
}

function escapeHtmlAttribute(
  value: string,
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function injectBaseHref(
  html: string,
  baseUrl: string | undefined,
) {
  const normalizedBaseUrl =
    normalizeBaseUrl(baseUrl);

  if (
    !normalizedBaseUrl ||
    /<base\b/i.test(html)
  ) {
    return html;
  }

  const baseTag =
    `<base href="${escapeHtmlAttribute(
      normalizedBaseUrl,
    )}" />`;

  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(
      /<head\b([^>]*)>/i,
      (match) =>
        `${match}\n  ${baseTag}`,
    );
  }

  return html.replace(
    /<html\b([^>]*)>/i,
    (match) =>
      `${match}\n<head>${baseTag}</head>`,
  );
}

async function waitForFonts(
  page: Page,
) {
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
  });
}

async function waitForImages(
  page: Page,
) {
  await page.evaluate(
    async ({ timeoutMs }) => {
      const images =
        Array.from(document.images);

      await Promise.all(
        images.map(async (image) => {
          if (!image.complete) {
            await new Promise<void>(
              (resolve) => {
                let settled = false;

                const finish = () => {
                  if (settled) {
                    return;
                  }

                  settled = true;
                  resolve();
                };

                image.addEventListener(
                  "load",
                  finish,
                  { once: true },
                );

                image.addEventListener(
                  "error",
                  finish,
                  { once: true },
                );

                window.setTimeout(
                  finish,
                  timeoutMs,
                );
              },
            );
          }

          if (
            typeof image.decode ===
            "function"
          ) {
            await image
              .decode()
              .catch(() => undefined);
          }
        }),
      );
    },
    {
      timeoutMs:
        IMAGE_READY_TIMEOUT_MS,
    },
  );
}

async function waitForAnimationFrames(
  page: Page,
  count = 2,
) {
  await page.evaluate(
    async ({ frameCount }) => {
      for (
        let index = 0;
        index < frameCount;
        index += 1
      ) {
        await new Promise<void>(
          (resolve) => {
            requestAnimationFrame(
              () => resolve(),
            );
          },
        );
      }
    },
    {
      frameCount: count,
    },
  );
}

async function waitForDomStability(
  page: Page,
) {
  await page.evaluate(
    async ({
      quietTimeMs,
      hardTimeoutMs,
    }) => {
      await new Promise<void>(
        (resolve) => {
          let finished = false;

          let quietTimer:
            | number
            | undefined;

          let hardTimer:
            | number
            | undefined;

          const finish = () => {
            if (finished) {
              return;
            }

            finished = true;

            observer.disconnect();

            if (
              quietTimer !== undefined
            ) {
              window.clearTimeout(
                quietTimer,
              );
            }

            if (
              hardTimer !== undefined
            ) {
              window.clearTimeout(
                hardTimer,
              );
            }

            resolve();
          };

          const scheduleQuietFinish =
            () => {
              if (
                quietTimer !== undefined
              ) {
                window.clearTimeout(
                  quietTimer,
                );
              }

              quietTimer =
                window.setTimeout(
                  finish,
                  quietTimeMs,
                );
            };

          const observer =
            new MutationObserver(
              scheduleQuietFinish,
            );

          observer.observe(
            document.documentElement,
            {
              subtree: true,
              childList: true,
              attributes: true,
              characterData: true,
            },
          );

          scheduleQuietFinish();

          hardTimer =
            window.setTimeout(
              finish,
              hardTimeoutMs,
            );
        },
      );
    },
    {
      quietTimeMs:
        DOM_QUIET_TIME_MS,

      hardTimeoutMs:
        DOM_STABILITY_TIMEOUT_MS,
    },
  );
}

async function waitForReportRender(
  page: Page,
) {
  await page.waitForFunction(
    () =>
      document.readyState !==
      "loading",
    undefined,
    {
      timeout:
        REPORT_READY_TIMEOUT_MS,
    },
  );

  await page.waitForSelector(
    ".report-document",
    {
      state: "attached",
      timeout:
        REPORT_READY_TIMEOUT_MS,
    },
  );

  await page.waitForFunction(
    () => {
      const reportWindow =
        window as typeof window & {
          __REPORT_RENDER_MODE__?:
            string;
        };

      if (
        reportWindow
          .__REPORT_RENDER_MODE__ !==
        "sample_redacted"
      ) {
        return true;
      }

      return (
        document.documentElement
          .getAttribute(
            "data-report-auto-masking-ready",
          ) === "true"
      );
    },
    undefined,
    {
      timeout:
        REPORT_READY_TIMEOUT_MS,
    },
  );

  /*
   * Bardzo ważne:
   * fonty, obrazy i JS raportu kończymy
   * jeszcze w trybie SCREEN.
   *
   * Dzięki temu globalJs/page.js widzą takie
   * samo środowisko jak podgląd raportu.
   */
  await waitForFonts(page);
  await waitForImages(page);
  await waitForAnimationFrames(
    page,
    2,
  );
  await waitForDomStability(page);

  /*
   * Wyłączamy animacje dopiero po wykonaniu
   * logiki generującej raport.
   */
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });

  await waitForAnimationFrames(
    page,
    1,
  );
}

async function preparePrintLayout(
  page: Page,
) {
  /*
   * KLUCZOWA POPRAWKA:
   *
   * Dopiero TERAZ przechodzimy do print media.
   *
   * Nie robimy tego przed setContent()/goto(),
   * ponieważ globalJs i page.js raportu muszą
   * zbudować dokument tak samo jak w preview.
   */
  await page.emulateMedia({
    media: "print",
  });

  /*
   * Zmiana media query powoduje reflow.
   * Czekamy ponownie na fonty i layout,
   * ale nie uruchamiamy ponownie JS raportu.
   */
  await waitForFonts(page);

  await waitForAnimationFrames(
    page,
    2,
  );

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

async function createPdf(
  loadDocument: (
    page: Page,
  ) => Promise<void>,
  cookieHeader?: string,
) {
  let browser;

  try {
    browser =
      await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
      });

    const page =
      await browser.newPage({
        viewport: {
          width: 794,
          height: 1123,
        },
        deviceScaleFactor: 1,
      });

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({
        cookie: cookieHeader,
      });
    }

    /*
     * Dokument ZAWSZE startuje jako screen.
     *
     * To odwzorowuje zachowanie iframe preview.
     */
    await page.emulateMedia({
      media: "screen",
    });

    await loadDocument(page);

    /*
     * Cały HTML + page.js + globalJs
     * kończą renderowanie w screen media.
     */
    await waitForReportRender(page);

    /*
     * Dopiero gotowy dokument przełączamy
     * na reguły przeznaczone dla wydruku.
     */
    await preparePrintLayout(page);

    return await page.pdf({
      format: "A4",

      printBackground: true,

      preferCSSPageSize: true,

      scale: 1,

      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });
  } finally {
    await browser?.close();
  }
}

export async function renderReportPdfFromUrl(
  input: RenderReportPdfFromUrlInput,
) {
  return createPdf(
    async (page) => {
      const response =
        await page.goto(input.url, {
          /*
           * Nie wracamy do networkidle.
           * To powodowało poprzedni timeout.
           */
          waitUntil:
            "domcontentloaded",

          timeout:
            NAVIGATION_TIMEOUT_MS,
        });

      if (!response) {
        throw new Error(
          "Nie otrzymano odpowiedzi strony drukowania raportu.",
        );
      }

      if (!response.ok()) {
        throw new Error(
          [
            "Strona drukowania raportu",
            `zwróciła HTTP ${response.status()}.`,
          ].join(" "),
        );
      }
    },
    input.cookieHeader,
  );
}

export async function renderReportPdfFromHtml(
  input: RenderReportPdfFromHtmlInput,
) {
  const html =
    injectBaseHref(
      input.html,
      input.baseUrl,
    );

  return createPdf(
    async (page) => {
      await page.setContent(
        html,
        {
          /*
           * Tak samo tutaj:
           * nie czekamy na networkidle.
           */
          waitUntil:
            "domcontentloaded",

          timeout:
            NAVIGATION_TIMEOUT_MS,
        },
      );
    },
    input.cookieHeader,
  );
}