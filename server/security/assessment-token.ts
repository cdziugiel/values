import { createHash, randomBytes } from "node:crypto";

export function generateAssessmentAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAssessmentAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}