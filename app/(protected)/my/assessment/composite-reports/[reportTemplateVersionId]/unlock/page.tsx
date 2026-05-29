import { UnlockCompositeReportAccessPage } from "@/features/report-access/components/unlock-composite-report-access-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    reportTemplateVersionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { reportTemplateVersionId } = await params;
  const { tenant } = await searchParams;

  return (
    <UnlockCompositeReportAccessPage
      tenantSlug={tenant ?? "humanet"}
      reportTemplateVersionId={reportTemplateVersionId}
    />
  );
}