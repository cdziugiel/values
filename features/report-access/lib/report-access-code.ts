import crypto from "crypto";

export function createReportAccessPlainCode() {
  const partA = crypto.randomBytes(3).toString("hex").toUpperCase();
  const partB = crypto.randomBytes(3).toString("hex").toUpperCase();
  const partC = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `HV-${partA}-${partB}-${partC}`;
}

export function hashReportAccessCode(code: string) {
  return crypto
    .createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}

export function previewReportAccessCode(code: string) {
  const normalized = code.trim().toUpperCase();

  if (normalized.length <= 8) {
    return normalized;
  }

  return `••••-${normalized.slice(-4)}`;
}