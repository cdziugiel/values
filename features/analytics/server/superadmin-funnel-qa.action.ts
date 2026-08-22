// @humanet-funnel-analytics-v1.1
"use server";

import { redirect } from "next/navigation";

import { dispatchAssessmentFunnelEvent } from "@/features/analytics/server/assessment-funnel.analytics";
import type { ReportType } from "@/features/purchase-flow/types/purchase-flow.types";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

const ALLOWED_EVENTS = new Set([
  "assessment_start",
  "assessment_complete",
  "join_research_program",
  "view_basic_result",
  "view_report",
] as const);

const ALLOWED_REPORT_TYPES = new Set<ReportType>([
  "relations",
  "work",
  "change",
]);

type QaEventName =
  | "assessment_start"
  | "assessment_complete"
  | "join_research_program"
  | "view_basic_result"
  | "view_report";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function backHref(status: "sent" | "not-sent" | "invalid", eventName = "") {
  const params = new URLSearchParams({ status });
  if (eventName) params.set("event", eventName);
  return "/dashboard/analytics-qa?" + params.toString();
}

export async function sendSuperAdminFunnelQaEventAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const rawEvent = read(formData, "eventName");
  const rawReportType = read(formData, "reportType");

  if (!ALLOWED_EVENTS.has(rawEvent as QaEventName)) {
    redirect(backHref("invalid"));
  }

  const reportType = ALLOWED_REPORT_TYPES.has(rawReportType as ReportType)
    ? (rawReportType as ReportType)
    : null;

  const sent = await dispatchAssessmentFunnelEvent({
    userId: user.id,
    name: rawEvent as QaEventName,
    reportType,
    entryFlow: "research_program",
    surface: "superadmin_analytics_qa",
    qaMode: true,
  });

  redirect(backHref(sent ? "sent" : "not-sent", rawEvent));
}
