import { RespondentsPage } from "@/features/respondents";

type RespondentsRouteProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function RespondentsRoute({
  params,
}: RespondentsRouteProps) {
  const { tenantSlug } = await params;

  return <RespondentsPage tenantSlug={tenantSlug} />;
}