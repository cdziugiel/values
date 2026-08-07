// app/(print)/my/reports/composite/grants/[grantId]/print/page.tsx

import { notFound } from "next/navigation";

import {
  getMyPersonalCompositeReportByGrantForCurrentUser,
} from "@/features/report-access/api/my-composite-report.queries";

import {
  getReportTemplateVersionForRender,
} from "@/features/report-builder/api/report-render.queries";

import {
  renderReportDocument,
} from "@/features/report-builder/lib/report-template-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    grantId: string;
  }>;

  searchParams: Promise<{
    tenant?: string;
  }>;
};

export default async function MyCompositeReportPrintPage({
  params,
  searchParams,
}: PageProps) {
  const { grantId } = await params;
  const { tenant } = await searchParams;

  const tenantSlug =
    tenant?.trim() || null;

  if (!tenantSlug) {
    notFound();
  }

  const data =
    await getMyPersonalCompositeReportByGrantForCurrentUser({
      tenantSlug,
      grantId,
    });

  if (
    !data ||
    !data.eligibility.canRender
  ) {
    notFound();
  }

  const reportTemplateVersion =
    await getReportTemplateVersionForRender({
      reportTemplateVersionId:
        data.reportTemplateVersionId,
    });

  if (!reportTemplateVersion) {
    notFound();
  }

  const rendered =
    renderReportDocument({
      reportTemplateVersion,
      payload: data.payload,
    });

  /**
   * Celowo identyczny mechanizm jak w działającym
   * standardowym MyAssessmentReportPrintPage.
   *
   * Ta strona działa w route group (print), więc przechodzi
   * przez root app/layout.tsx i dostaje ten sam globals.css /
   * next/font co raport standardowy.
   */
  return (
    <main
      className="report-print-root"
      dangerouslySetInnerHTML={{
        __html: rendered.html,
      }}
    />
  );
}
