import { DiscountCodesAdminPage } from "@/features/discount-codes/admin";

type PageProps = {
  searchParams?: Promise<{
    showArchived?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const showArchived = resolvedSearchParams?.showArchived === "1";

  return <DiscountCodesAdminPage showArchived={showArchived} />;
}