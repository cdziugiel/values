// app/(protected)/my/assessment/sessions/[sessionId]/unlock-report/page.tsx
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
  projectQuestionnaireId?: string;
  questionnaireVersionId?: string;
}>;
};

export default async function Page({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
const {
  tenant,
  mode,
  product,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
} = await searchParams;

  if (!tenant) {
    notFound();
  }
console.log("UNLOCK_REPORT_ROUTE_PARAMS", {
  hrefSearchParams: await searchParams,
  sessionId,
  tenant,
  mode,
  product,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
});
  return (
<UnlockReportAccessPage
  tenantSlug={tenant ?? "humanet"}
  sessionId={sessionId}
  mode={mode === "comparison" ? "comparison" : "standard"}
  productId={product ?? null}
  reportTemplateVersionId={reportTemplateVersionId ?? null}
  projectQuestionnaireId={projectQuestionnaireId ?? null}
  questionnaireVersionId={questionnaireVersionId ?? null}
/>
  );
}