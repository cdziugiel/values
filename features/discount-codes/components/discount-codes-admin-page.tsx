// features/discount-codes/components/discount-codes-admin-page.tsx
import Link from "next/link";
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  CirclePause,
  CircleSlash,
  Eye,
  EyeOff,
  Gift,
  Hash,
  InfinityIcon,
  Percent,
  PlusCircle,
  ReceiptText,
  TicketPercent,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui/page-header";

import {
  listDiscountCodesForAdmin,
  type DiscountCodeAdminListItem,
} from "../api/discount-code.queries";

import { CreateDiscountCodeForm } from "./discount-code-create-form";
import { DiscountCodeStatusActions } from "./discount-code-status-actions";

function formatMoney(cents: number | null | undefined) {
  if (cents == null) return "—";

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(cents / 100);
}

function formatPercent(bps: number | null | undefined) {
  if (bps == null) return "—";

  return `${(bps / 100).toLocaleString("pl-PL", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(date: Date | null) {
  if (!date) return "bez ograniczenia";

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAppliesTo(value: DiscountCodeAdminListItem["appliesTo"]) {
  switch (value) {
    case "report_unlock":
      return "Odblokowanie raportu";
    case "report_access_purchase":
      return "Zakup dostępów";
    case "all_report_access":
      return "Raporty i dostępy";
    default:
      return value;
  }
}

function StatusBadge({
  status,
}: {
  status: DiscountCodeAdminListItem["status"];
}) {
  if (status === "active") {
    return (
      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Aktywny
      </Badge>
    );
  }

  if (status === "paused") {
    return (
      <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
        Wstrzymany
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-100">
      Zarchiwizowany
    </Badge>
  );
}

function DiscountValue({ code }: { code: DiscountCodeAdminListItem }) {
  if (code.discountType === "fixed_amount") {
    return (
      <span className="inline-flex items-center gap-1">
        <ReceiptText size={14} />
        {formatMoney(code.discountValueCents)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <BadgePercent size={14} />
      {formatPercent(code.discountPercentBps)}
    </span>
  );
}

function SmallMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white/75 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            {label}
          </p>
          <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyCodesState() {
  return (
    <section className="rounded-[2rem] border border-dashed border-black/15 bg-white/60 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
        <TicketPercent size={22} />
      </div>

      <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[#171717]">
        Nie ma jeszcze kodów rabatowych
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
        Utwórz pierwszy kod, aby można było obniżać cenę odblokowania raportu
        albo zakupu puli dostępów. Kod może obniżyć cenę częściowo albo do zera.
      </p>
    </section>
  );
}

function DiscountCodeCard({ code }: { code: DiscountCodeAdminListItem }) {
  const limitLabel =
    code.maxRedemptions == null
      ? "bez limitu"
      : `${code.redeemedCount}/${code.maxRedemptions}`;

  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/75 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={code.status} />

            <Badge className="rounded-full border border-black/10 bg-white text-[#171717] hover:bg-white">
              {formatAppliesTo(code.appliesTo)}
            </Badge>

            {code.allowZeroFinalPrice ? (
              <Badge className="rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.12)] text-[#0f766e] hover:bg-[rgba(45,212,191,0.12)]">
                może zejść do 0 zł
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[#171717]">
            {code.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#6b7280]">
            <span className="inline-flex items-center gap-1 font-mono text-[#171717]">
              <Hash size={14} />
              {code.codePreview}
            </span>

            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} />
              {formatDateTime(code.createdAt)}
            </span>
          </div>

          {code.description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
              {code.description}
            </p>
          ) : null}
        </div>

        <DiscountCodeStatusActions
          discountCodeId={code.id}
          currentStatus={code.status}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            Rabat
          </p>
          <div className="mt-2 text-lg font-semibold text-[#171717]">
            <DiscountValue code={code} />
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            Użycia
          </p>
          <div className="mt-2 text-lg font-semibold text-[#171717]">
            {limitLabel}
          </div>
          <p className="mt-1 text-xs text-[#6b7280]">
            Per user: {code.maxRedemptionsPerUser ?? "—"} · Per tenant:{" "}
            {code.maxRedemptionsPerTenant ?? "—"}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            Ważność
          </p>
          <div className="mt-2 text-sm font-medium leading-6 text-[#171717]">
            od {formatDate(code.startsAt)}
            <br />
            do {formatDate(code.endsAt)}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            Warunki
          </p>
          <div className="mt-2 text-sm font-medium leading-6 text-[#171717]">
            min.: {formatMoney(code.minimumOrderValueCents)}
            <br />
            max rabat: {formatMoney(code.maximumDiscountCents)}
          </div>
        </div>
      </div>
    </article>
  );
}


function ArchivedToggleButton({
  showArchived,
  archivedCount,
}: {
  showArchived: boolean;
  archivedCount: number;
}) {
  return (
    <Link
      href={
        showArchived
          ? "/dashboard/discount-codes"
          : "/dashboard/discount-codes?showArchived=1"
      }
      className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f9fafb]"
    >
      {showArchived ? <EyeOff size={15} /> : <Eye size={15} />}
      {showArchived
        ? "Ukryj zarchiwizowane"
        : `Pokaż zarchiwizowane (${archivedCount})`}
    </Link>
  );
}


export async function DiscountCodesAdminPage({
  showArchived = false,
}: {
  showArchived?: boolean;
}) {
  const codes = await listDiscountCodesForAdmin();

  const activeCount = codes.filter((code) => code.status === "active").length;
  const pausedCount = codes.filter((code) => code.status === "paused").length;
  const archivedCount = codes.filter(
    (code) => code.status === "archived",
  ).length;
const visibleCodes = showArchived
  ? codes
  : codes.filter((code) => code.status !== "archived");
  const redeemedCount = codes.reduce(
    (sum, code) => sum + code.redeemedCount,
    0,
  );

  return (
    <main className="space-y-8">
      <PageHeader
        title="Kody rabatowe"
        description="Tworzenie i zarządzanie kodami rabatowymi dla odblokowania raportów oraz zakupu dostępów."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SmallMetric
          label="Aktywne"
          value={activeCount}
          icon={<CheckCircle2 size={16} />}
        />

        <SmallMetric
          label="Wstrzymane"
          value={pausedCount}
          icon={<CirclePause size={16} />}
        />

        <SmallMetric
          label="Archiwalne"
          value={archivedCount}
          icon={<CircleSlash size={16} />}
        />

        <SmallMetric
          label="Realizacje"
          value={redeemedCount}
          icon={<Gift size={16} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-6 xl:self-start">
          <CreateDiscountCodeForm />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#171717]">
                Lista kodów
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                Kody są sprawdzane ponownie w momencie finalizacji zakupu lub
                odblokowania raportu.
              </p>
            </div>

<div className="flex flex-wrap items-center gap-2">
  <ArchivedToggleButton
    showArchived={showArchived}
    archivedCount={archivedCount}
  />

  <Badge className="rounded-full border border-black/10 bg-white px-3 py-1 text-[#171717] hover:bg-white">
    <BadgePercent size={14} className="mr-1" />
    {visibleCodes.length} z {codes.length} kodów
  </Badge>
</div>
          </div>

{visibleCodes.length === 0 ? (
  <EmptyCodesState />
) : (
  <div className="space-y-4">
    {visibleCodes.map((code) => (
      <DiscountCodeCard key={code.id} code={code} />
    ))}
  </div>
)}
        </div>
      </section>
    </main>
  );
}