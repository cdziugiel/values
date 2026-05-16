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
  }>;
};

export default async function MyAssessmentUnlockReportPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
  const { tenant } = await searchParams;

  if (!tenant) {
    notFound();
  }

  return (
    <UnlockReportAccessPage
      tenantSlug={tenant}
      sessionId={sessionId}
    />
  );
}