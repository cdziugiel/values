// features/report-builder/lib/report-pdf-html.ts

type BuildReportPdfHtmlInput = {
  title: string;
  bodyHtml: string;
};

export function buildReportPdfHtml(input: BuildReportPdfHtmlInput) {
  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #f4f1ec;
      color: #1f2933;
      font-family: "Inter", "DejaVu Sans", "Liberation Sans", Arial, sans-serif;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report-pdf-root {
      width: 210mm;
      margin: 0 auto;
      background: #f4f1ec;
    }

    .report-page {
      width: 210mm;
      min-height: 297mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      position: relative;
    }

    .report-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    svg {
      max-width: 100%;
    }

    img {
      max-width: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <main class="report-pdf-root">
    ${input.bodyHtml}
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}