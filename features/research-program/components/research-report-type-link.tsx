"use client";

import Link from "next/link";

import { trackEvent } from "@/features/consent";

export function ResearchReportTypeLink({
  href,
  reportType,
  children,
}: {
  href: string;
  reportType: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() =>
        trackEvent("select_report_type", {
          report_type: reportType,
          surface: "values_research_program",
        })
      }
      className="block rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      {children}
    </Link>
  );
}
