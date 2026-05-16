import Link from "next/link";

import { Button } from "@/components/ui/button";

import { getTenantReportAccessOrdersPageData } from "../api/tenant-report-access-orders.queries";
import { ReportAccessOrdersHistory } from "./report-access-orders-history";
import { TenantReportAccessPoolSummary } from "./tenant-report-access-pool-summary";

type TenantReportAccessOrdersPageProps = {
  tenantSlug: string;
};

export async function TenantReportAccessOrdersPage({
  tenantSlug,
}: TenantReportAccessOrdersPageProps) {
  const data = await getTenantReportAccessOrdersPageData({ tenantSlug });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="text-sm font-medium text-muted-foreground">
          HUMANET VALUES · Dostępy raportowe
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Zakupy i dostępy raportowe
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Tenant: {data.tenant.name} ({data.tenant.slug}). Tu widzisz
              wszystkie zamówienia dostępów raportowych oraz globalną pulę
              dostępów.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href={`/t/${tenantSlug}/assessment-projects`}>
              Wróć do projektów
            </Link>
          </Button>
        </div>
      </section>

      <div className="mt-8">
        <TenantReportAccessPoolSummary pool={data.pool} />
      </div>

      <div className="mt-8">
        <ReportAccessOrdersHistory orders={data.orders} />
      </div>
    </main>
  );
}