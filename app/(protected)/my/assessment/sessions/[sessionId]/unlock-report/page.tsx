import { notFound } from "next/navigation";

import { UnlockReportAccessPage } from "@/features/report-access/components/unlock-report-access-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
    mode?: string;
    product?: string;
    reportTemplateVersionId?: string;
  }>;
};

export default async function Page({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
    const { tenant, mode, product, reportTemplateVersionId } =
    await searchParams;

  if (!tenant) {
    notFound();
  }

  return (
    <UnlockReportAccessPage
      tenantSlug={tenant ?? "humanet"}
      sessionId={sessionId}
      mode={mode === "comparison" ? "comparison" : "standard"}
      productId={product ?? null}
      reportTemplateVersionId={reportTemplateVersionId ?? null}
    />
  );
}