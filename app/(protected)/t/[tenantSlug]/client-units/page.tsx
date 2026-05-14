import { ClientUnitsPage } from "@/features/client-units";

type ClientUnitsRouteProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function ClientUnitsRoute({
  params,
}: ClientUnitsRouteProps) {
  const { tenantSlug } = await params;

  return <ClientUnitsPage tenantSlug={tenantSlug} />;
}