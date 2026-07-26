import type { NextRequest } from "next/server";

export function resolveReportRenderOrigin(
  request: NextRequest,
) {
  const configuredOrigin =
    process.env.REPORT_RENDER_BASE_URL?.trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  const origin = new URL(request.nextUrl.origin);

  if (
    origin.hostname === "0.0.0.0" ||
    origin.hostname === "::"
  ) {
    origin.hostname = "127.0.0.1";
  }

  if (
    origin.hostname === "127.0.0.1" ||
    origin.hostname === "localhost"
  ) {
    origin.protocol = "http:";
  }

  return origin.origin;
}