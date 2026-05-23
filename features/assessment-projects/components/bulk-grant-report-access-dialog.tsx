// features/partner-report-access/components/bulk-grant-report-access-dialog.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  PackageCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  bulkGrantReportAccessToCompletedSessionsAction,
  type PartnerGrantReportAccessState,
} from "../api/partner-report-access.actions";

const initialState: PartnerGrantReportAccessState = {
  status: "idle",
  message: "",
};

type BulkGrantProduct = {
  id: string;
  code: string;
  name: string;
  availableCount?: number | string | null;
};

type BulkGrantSession = {
  sessionId: string;
  sessionStatus: string | null;
  sessionCompletedAt?: string | Date | null;
  respondentEmail?: string | null;
  grants: {
    reportTemplateId: string;
    reportTemplateVersionId: string;
    isCurrentlyActive: boolean;
  }[];
};

type BulkGrantReportAccessDialogProps = {
  tenantSlug: string;
  projectId: string;
  products: BulkGrantProduct[];
  sessions: BulkGrantSession[];
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSessionTimestamp(session: BulkGrantSession) {
  const date = session.sessionCompletedAt
    ? new Date(String(session.sessionCompletedAt))
    : null;

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function getDefaultSelectedSessionIds(sessions: BulkGrantSession[]) {
  const latestSessionByEmail = new Map<string, BulkGrantSession>();

  for (const session of sessions) {
    if (session.sessionStatus !== "completed") {
      continue;
    }

    const hasActiveGrant = session.grants.some(
      (grant) => grant.isCurrentlyActive,
    );

    if (hasActiveGrant) {
      continue;
    }

    const key = session.respondentEmail ?? session.sessionId;
    const current = latestSessionByEmail.get(key);

    if (!current || getSessionTimestamp(session) > getSessionTimestamp(current)) {
      latestSessionByEmail.set(key, session);
    }
  }

  return new Set(
    Array.from(latestSessionByEmail.values()).map(
      (session) => session.sessionId,
    ),
  );
}

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </p>

      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
        {value}
      </div>

      {helper ? (
        <p className="mt-1 text-xs leading-5 text-[#6b7280]">{helper}</p>
      ) : null}
    </div>
  );
}

export function BulkGrantReportAccessDialog({
  tenantSlug,
  projectId,
  products,
  sessions,
}: BulkGrantReportAccessDialogProps) {
  const [state, formAction, isPending] = useActionState(
    bulkGrantReportAccessToCompletedSessionsAction,
    initialState,
  );

  const availableProducts = useMemo(
    () => products.filter((product) => numberValue(product.availableCount) > 0),
    [products],
  );

  const [selectedProductId, setSelectedProductId] = useState(
    availableProducts[0]?.id ?? "",
  );

  const selectedProduct = useMemo(
    () =>
      availableProducts.find((product) => product.id === selectedProductId) ??
      null,
    [availableProducts, selectedProductId],
  );

  const defaultSelectedSessionIds = useMemo(() => {
    if (!selectedProduct) {
      return new Set<string>();
    }

    /**
     * Docelowo filtrowanie można zrobić po reportTemplateId produktu.
     * Na teraz przyjmujemy: zakończona sesja bez jakiegokolwiek aktywnego grantu.
     */
    return getDefaultSelectedSessionIds(sessions);
  }, [selectedProduct, sessions]);

  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    () => defaultSelectedSessionIds,
  );

  /**
   * Gdy użytkownik zmieni produkt, resetujemy wybór do domyślnej listy.
   */
  function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    setSelectedSessionIds(getDefaultSelectedSessionIds(sessions));
  }

  const candidateSessions = useMemo(() => {
    return sessions
      .filter((session) => session.sessionStatus === "completed")
      .filter(
        (session) =>
          !session.grants.some((grant) => grant.isCurrentlyActive),
      )
      .sort((left, right) => {
        const emailDiff = String(left.respondentEmail ?? "").localeCompare(
          String(right.respondentEmail ?? ""),
          "pl",
          { sensitivity: "base", numeric: true },
        );

        if (emailDiff !== 0) {
          return emailDiff;
        }

        return getSessionTimestamp(right) - getSessionTimestamp(left);
      });
  }, [sessions]);

  const selectedCount = selectedSessionIds.size;
  const availableCount = selectedProduct
    ? numberValue(selectedProduct.availableCount)
    : 0;

  const hasTooManySelected = selectedCount > availableCount;

  function toggleSession(sessionId: string) {
    setSelectedSessionIds((previous) => {
      const next = new Set(previous);

      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }

      return next;
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <UsersRound size={16} />
          Nadaj dostęp zbiorczo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] w-[min(1100px,calc(100vw-32px))] min-w-[50vw] max-w-[1000px] overflow-y-auto rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="p-6 md:p-8">
          <DialogHeader>
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <KeyRound size={13} />
              Dostępy raportowe
            </div>

            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Zbiorcze nadanie dostępu do raportu
            </DialogTitle>

            <DialogDescription className="max-w-3xl text-sm leading-6 text-[#6b7280]">
              Domyślnie zaznaczona jest ostatnia zakończona sesja każdego
              respondenta bez aktywnego raportu. Możesz odznaczyć wybrane osoby
              przed zatwierdzeniem.
            </DialogDescription>
          </DialogHeader>

          {availableProducts.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              Brak wolnych dostępów w puli. Najpierw kup albo wygeneruj dostęp
              dla partnera.
            </div>
          ) : (
            <form action={formAction} className="mt-6 space-y-6">
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="projectId" value={projectId} />
              <input
                type="hidden"
                name="productId"
                value={selectedProduct?.id ?? ""}
              />

              {Array.from(selectedSessionIds).map((sessionId) => (
                <input
                  key={sessionId}
                  type="hidden"
                  name="sessionIds"
                  value={sessionId}
                />
              ))}

              <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                  <label
                    htmlFor="bulk-grant-product"
                    className="text-sm font-medium text-[#171717]"
                  >
                    Produkt / typ raportu
                  </label>

                  <select
                    id="bulk-grant-product"
                    value={selectedProductId}
                    onChange={(event) => handleProductChange(event.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  >
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.code})
                      </option>
                    ))}
                  </select>

                  {selectedProduct ? (
                    <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                      Wybrany produkt ma{" "}
                      <span className="font-semibold text-[#171717]">
                        {availableCount}
                      </span>{" "}
                      wolnych dostępów.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                  <MiniMetric
                    label="Zaznaczone"
                    value={selectedCount}
                    helper="sesje do nadania dostępu"
                  />

                  <MiniMetric
                    label="Wolne w puli"
                    value={availableCount}
                    helper="dostępne kody / granty"
                  />

                  <MiniMetric
                    label="Kandydaci"
                    value={candidateSessions.length}
                    helper="zakończone sesje bez raportu"
                  />
                </div>
              </section>

              {hasTooManySelected ? (
                <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  Zaznaczono więcej sesji niż dostępnych kodów. Zmniejsz wybór
                  albo uzupełnij pulę dostępów.
                </div>
              ) : null}

              <section className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                      Sesje do nadania dostępu
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                      Lista zawiera zakończone sesje bez aktywnego dostępu do
                      raportu.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                      onClick={() =>
                        setSelectedSessionIds(
                          new Set(
                            candidateSessions.map(
                              (session) => session.sessionId,
                            ),
                          ),
                        )
                      }
                    >
                      Zaznacz wszystkie
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                      onClick={() => setSelectedSessionIds(new Set())}
                    >
                      Odznacz wszystkie
                    </Button>
                  </div>
                </div>

                {candidateSessions.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
                    Brak zakończonych sesji bez aktywnego dostępu.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 lg:hidden">
                      {candidateSessions.map((session) => {
                        const selected = selectedSessionIds.has(
                          session.sessionId,
                        );

                        return (
                          <label
                            key={session.sessionId}
                            className={[
                              "cursor-pointer rounded-[1.5rem] border p-4 shadow-sm transition",
                              selected
                                ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)]"
                                : "border-black/10 bg-white/70 hover:bg-white",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSession(session.sessionId)}
                                className="mt-1"
                              />

                              <div className="min-w-0">
                                <div className="font-medium text-[#171717]">
                                  {session.respondentEmail ?? "—"}
                                </div>

                                <div className="mt-1 font-mono text-xs text-[#6b7280]">
                                  {session.sessionId}
                                </div>

                                <div className="mt-2 text-xs text-[#6b7280]">
                                  Zakończono:{" "}
                                  {formatDateTime(session.sessionCompletedAt)}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                            <tr>
                              <th className="w-12 px-4 py-3 text-left"></th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Respondent
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Sesja
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Zakończono
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {candidateSessions.map((session) => {
                              const selected = selectedSessionIds.has(
                                session.sessionId,
                              );

                              return (
                                <tr
                                  key={session.sessionId}
                                  className="border-b border-black/10 last:border-0"
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() =>
                                        toggleSession(session.sessionId)
                                      }
                                    />
                                  </td>

                                  <td className="px-4 py-3">
                                    <div className="font-medium text-[#171717]">
                                      {session.respondentEmail ?? "—"}
                                    </div>
                                  </td>

                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs text-[#6b7280]">
                                      {session.sessionId}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-[#6b7280]">
                                    {formatDateTime(
                                      session.sessionCompletedAt,
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </section>

              <ActionMessage status={state.status} message={state.message} />

              <div className="flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <PackageCheck size={14} />
                  Operacja nada dostęp tylko zaznaczonym sesjom.
                </div>

                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    selectedCount === 0 ||
                    !selectedProduct ||
                    hasTooManySelected
                  }
                  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
                >
                  <KeyRound size={16} />
                  {isPending
                    ? "Nadawanie..."
                    : `Nadaj dostęp (${selectedCount})`}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
