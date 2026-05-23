// features/report-access/components/my-report-access-list.tsx

import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  KeyRound,
  Lock,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { getMyReportAccesses } from "../api/my-report-access.queries";

function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getSourceLabel(source: string) {
  switch (source) {
    case "purchase":
      return "Zakup";
    case "placeholder_payment":
      return "Płatność testowa";
    case "access_code":
      return "Kod dostępu";
    case "invitation":
      return "Zaproszenie";
    case "admin_grant":
      return "Nadany przez admina";
    default:
      return source;
  }
}

function getSourceIcon(source: string) {
  switch (source) {
    case "purchase":
    case "placeholder_payment":
      return <Ticket size={14} />;
    case "access_code":
      return <KeyRound size={14} />;
    case "invitation":
      return <FileText size={14} />;
    case "admin_grant":
      return <ShieldCheck size={14} />;
    default:
      return <FileText size={14} />;
  }
}

function getStatusLabel(access: {
  status: string;
  isCurrentlyActive: boolean;
}) {
  if (access.isCurrentlyActive) return "Aktywny";
  if (access.status === "revoked") return "Cofnięty";
  if (access.status === "expired") return "Wygasły";

  return access.status;
}

function AccessStatusBadge({
  access,
}: {
  access: {
    status: string;
    isCurrentlyActive: boolean;
  };
}) {
  const active = access.isCurrentlyActive;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        active
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-black/10 bg-[#f3f4f6] text-[#6b7280]",
      ].join(" ")}
    >
      {active ? <CheckCircle2 size={13} /> : <Lock size={13} />}
      {getStatusLabel(access)}
    </span>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-[#6b7280]">
      <span className="shrink-0 text-[#8b9099]">{icon}</span>
      <span className="shrink-0">{label}:</span>
      <span className="min-w-0 truncate font-medium text-[#171717]">
        {value}
      </span>
    </div>
  );
}

export async function MyReportAccessList() {
  const accesses = await getMyReportAccesses();

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
          <FileText size={13} />
          Moje raporty
        </div>

        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
          Dostępne raporty
        </h2>

        <p className="max-w-2xl text-sm leading-6 text-[#6b7280]">
          Tutaj znajdziesz raporty, do których masz aktywny dostęp. Szczegóły
          dostępu możesz rozwinąć tylko wtedy, gdy są potrzebne.
        </p>
      </div>

      {accesses.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
          Nie masz jeszcze aktywnych dostępów do raportów. Gdy raport zostanie
          odblokowany kodem, zakupem albo zaproszeniem, pojawi się w tym miejscu.
        </div>
      ) : (
        <div className="grid gap-3">
          {accesses.map((access) => (
            <article
              key={access.id}
              className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                      {access.reportTemplateName}
                    </h3>

                    <AccessStatusBadge access={access} />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <MetaItem
                      icon={<FileText size={14} />}
                      label="Wersja"
                      value={`${access.reportTemplateVersionName} (${access.reportTemplateVersion})`}
                    />

                    <MetaItem
                      icon={getSourceIcon(access.source)}
                      label="Źródło"
                      value={getSourceLabel(access.source)}
                    />

                    <MetaItem
                      icon={<Clock3 size={14} />}
                      label="Ważny do"
                      value={formatDateTime(access.validUntil)}
                    />
                  </div>
                </div>

                <div className="flex md:justify-end">
                  {access.isCurrentlyActive && access.reportHref ? (
                    <Button
                      asChild
                      className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] md:w-auto"
                    >
                      <Link href={access.reportHref}>Zobacz raport</Link>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="w-full rounded-full md:w-auto"
                      variant="outline"
                    >
                      Brak aktywnego dostępu
                    </Button>
                  )}
                </div>
              </div>

              <details className="group/details mt-4 border-t border-black/10 pt-3">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-sm text-[#6b7280] outline-none transition hover:text-[#171717] focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40">
                  Szczegóły dostępu
                  <ChevronDown
                    size={15}
                    className="transition group-open/details:rotate-180"
                  />
                </summary>

                <div className="mt-4 grid gap-2 rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-sm text-[#6b7280] sm:grid-cols-2">
                  <div>
                    Kod raportu: <span className="font-medium text-[#171717]">{access.reportTemplateCode}</span>
                  </div>

                  {access.productName ? (
                    <div>
                      Produkt: <span className="font-medium text-[#171717]">{access.productName}</span>
                    </div>
                  ) : null}

                  <div>
                    Nadano: <span className="font-medium text-[#171717]">{formatDateTime(access.createdAt)}</span>
                  </div>

                  <div>
                    Ważny do: <span className="font-medium text-[#171717]">{formatDateTime(access.validUntil)}</span>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
