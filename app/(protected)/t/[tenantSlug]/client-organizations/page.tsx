import { ClientOrganizationsPage } from "@/features/client-organizations";

type ClientOrganizationsRouteProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function ClientOrganizationsRoute({
  params,
}: ClientOrganizationsRouteProps) {
  const { tenantSlug } = await params;

  return <ClientOrganizationsPage tenantSlug={tenantSlug} />;
}