import { SystemTenantsPage } from "@/features/tenants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{
    archived?: string;
  }>;
};



export default async function Page({ searchParams }: PageProps) {
  const { archived } = await searchParams;

  return <SystemTenantsPage showArchived={archived === "1"} />;
}