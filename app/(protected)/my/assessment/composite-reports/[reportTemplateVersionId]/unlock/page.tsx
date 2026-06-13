// app/(protected)/my/assessment/composite-reports/[reportTemplateVersionId]/unlock/page.tsx

import { notFound } from "next/navigation";

import { UnlockCompositeReportAccessPage } from "@/features/report-access/components/unlock-composite-report-access-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    reportTemplateVersionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
    tenants?: string;
  }>;
};

function normalizeTenantSlugs({
  tenant,
  tenants,
}: {
  tenant?: string;
  tenants?: string;
}) {
  return Array.from(
    new Set(
      [
        ...(tenants?.split(",") ?? []),
        tenant ?? "",
      ]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const { reportTemplateVersionId } = await params;
  const { tenant, tenants } = await searchParams;

  const tenantSlugs = normalizeTenantSlugs({
    tenant,
    tenants,
  });

  if (tenantSlugs.length === 0) {
    notFound();
  }

  console.log("COMPOSITE_UNLOCK_ROUTE_HIT", {
    reportTemplateVersionId,
    tenant,
    tenants,
    tenantSlugs,
  });

  return (
    <UnlockCompositeReportAccessPage
      tenantSlugs={tenantSlugs}
      reportTemplateVersionId={reportTemplateVersionId}
    />
  );
}