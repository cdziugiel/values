import { TenantMembersPage } from "@/features/tenant-members";

type MembersPageProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function MembersPage({ params }: MembersPageProps) {
  const { tenantSlug } = await params;

  return <TenantMembersPage tenantSlug={tenantSlug} />;
}