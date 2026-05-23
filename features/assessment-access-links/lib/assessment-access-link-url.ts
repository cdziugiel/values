import { env } from "@/shared/config/env";

export function buildAssessmentAccessUrl(token: string) {
  const baseUrl = env.APP_URL.replace(/\/$/, "");

  return `${baseUrl}/a/${token}`;
}