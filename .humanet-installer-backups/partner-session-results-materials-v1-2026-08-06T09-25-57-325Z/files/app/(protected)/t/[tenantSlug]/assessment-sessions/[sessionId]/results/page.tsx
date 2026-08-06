import { AssessmentSessionResultsPage } from "@/features/assessment-results/components/assessment-session-results-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    sessionId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { tenantSlug, sessionId } = await params;
console.log("Assessment session results route params", {
  tenantSlug,
  sessionId,
});
  if (!tenantSlug || !sessionId) {
    throw new Error("Missing tenant or sessionId route params.");
  }

  return (
    <AssessmentSessionResultsPage
      tenantSlug={tenantSlug}
      sessionId={sessionId}
    />
  );
}