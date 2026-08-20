// HUMANET_INSTALLER: comparison-report-ui-pdf-v1
// Minimalny layout wydruku: bez ProtectedAppShell, topbara i toolbarów aplikacji.

import { notFound } from "next/navigation";

import { resolveMyComparisonReportGrantForRender } from "@/features/comparison-reports/api/my-comparison-report-grant.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    grantId: string;
  }>;
};

export default async function MyComparisonReportPrintPage({
  params,
}: PageProps) {
  const { grantId } = await params;

  const resolved = await resolveMyComparisonReportGrantForRender({
    grantId,
  });

  if (!resolved || !resolved.data.eligibility.canRender) {
    notFound();
  }

  const payload = resolved.data.payload;

  if (!payload) {
    notFound();
  }

  const rendered = renderReportDocument({
    reportTemplateVersion: resolved.reportTemplateVersion,
    payload,
  });

  return (
    <main
      className="report-print-root"
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  );
}
