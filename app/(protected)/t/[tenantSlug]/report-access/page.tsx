import { TenantReportAccessOrdersPage } from "@/features/report-access/components/tenant-report-access-orders-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function TenantReportAccessPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  return <TenantReportAccessOrdersPage tenantSlug={tenantSlug} />;
}