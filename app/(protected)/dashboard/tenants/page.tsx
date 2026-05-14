import { SystemTenantsPage } from "@/features/tenants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function TenantsPage() {
  return <SystemTenantsPage />;
}