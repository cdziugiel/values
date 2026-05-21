// features/report-builder/lib/render-report-pdf.ts

import { chromium } from "playwright";

type RenderReportPdfFromUrlInput = {
  url: string;
  cookieHeader?: string;
};

export async function renderReportPdfFromUrl(input: RenderReportPdfFromUrlInput) {
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

    if (input.cookieHeader) {
      await page.setExtraHTTPHeaders({
        cookie: input.cookieHeader,
      });
    }

    await page.goto(input.url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    await page.emulateMedia({ media: "print" });

    await page.evaluate(async () => {
      if ("fonts" in document) {
        await document.fonts.ready;
      }
    });

    return await page.pdf({
      width: "210mm",
      height: "297mm",
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