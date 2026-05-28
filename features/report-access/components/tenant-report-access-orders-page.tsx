// features/report-access/components/tenant-report-access-orders-page.tsx

import Link from "next/link";
import { ArrowLeft, PackageCheck, ReceiptText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getTenantReportAccessOrdersPageData } from "../api/tenant-report-access-orders.queries";
import { ReportAccessOrdersHistory } from "./report-access-orders-history";
import { TenantReportAccessPoolSummary } from "./tenant-report-access-pool-summary";
import { TenantReportAccessPurchaseDialog } from "./tenant-report-access-purchase-dialog";

type TenantReportAccessOrdersPageProps = {
  tenantSlug: string;
};

function BrandButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button
      asChild
      variant={variant === "primary" ? "default" : "outline"}
      className={
        variant === "primary"
          ? "rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          : "rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      }
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export async function TenantReportAccessOrdersPage({
  tenantSlug,
}: TenantReportAccessOrdersPageProps) {
  const data = await getTenantReportAccessOrdersPageData({ tenantSlug });

  return (

    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  HUMANET VALUES · Dostępy raportowe
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Zakupy i pula dostępów raportowych.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Partner:{" "}
                <span className="font-semibold text-[#171717]">
                  {data.tenant.name}
                </span>{" "}
                <span className="font-mono text-sm">({data.tenant.slug})</span>.
                Tu widzisz zamówienia dostępów raportowych oraz globalną pulę
                kodów dostępów.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:min-w-56">
              <TenantReportAccessPurchaseDialog
  tenantSlug={tenantSlug}
  products={data.products}
  billingProfile={data.billingProfile}
/>

              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                    <PackageCheck size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#171717]">
                      Produkty
                    </p>
                    <p className="mt-0.5 text-sm text-[#6b7280]">
                      {data.pool.length} w puli
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
                    <ReceiptText size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#171717]">
                      Zamówienia
                    </p>
                    <p className="mt-0.5 text-sm text-[#6b7280]">
                      {data.orders.length} zapisanych
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TenantReportAccessPoolSummary pool={data.pool} />

        <ReportAccessOrdersHistory orders={data.orders} />
      </div>
    </div>
  );
}
