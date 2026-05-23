// features/report-builder/components/report-real-data-preview-picker.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { ReportPreviewSessionOption } from "../api/report-preview-session.queries";

type ReportRealDataPreviewPickerProps = {
  reportTemplateVersionId: string;
  sessions: ReportPreviewSessionOption[];
};

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "brak daty";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "nieprawidłowa data";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function sessionMatchesSearch(
  session: ReportPreviewSessionOption,
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    session.tenantName,
    session.tenantSlug,
    session.projectName,
    session.respondentLabel,
    session.respondentEmail,
    session.sessionId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

export function ReportRealDataPreviewPicker({
  reportTemplateVersionId,
  sessions,
}: ReportRealDataPreviewPickerProps) {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [search, setSearch] = useState("");

  const filteredSessions = useMemo(
    () => sessions.filter((session) => sessionMatchesSearch(session, search)),
    [sessions, search],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId),
    [sessions, selectedSessionId],
  );

  const groupedSessions = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        tenantName: string;
        projectName: string;
        sessions: ReportPreviewSessionOption[];
      }
    >();

    for (const session of filteredSessions) {
      const key = `${session.tenantSlug}:${session.projectId}`;

      const existing = groups.get(key);

      if (existing) {
        existing.sessions.push(session);
      } else {
        groups.set(key, {
          key,
          tenantName: session.tenantName,
          projectName: session.projectName,
          sessions: [session],
        });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      sessions: group.sessions.toSorted((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;

        return bTime - aTime;
      }),
    }));
  }, [filteredSessions]);

  const previewHref = selectedSession
    ? `/t/${selectedSession.tenantSlug}/assessment-sessions/${selectedSession.sessionId}/report/${reportTemplateVersionId}?source=builder-preview&projectQuestionnaireId=${selectedSession.projectQuestionnaireId}`
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Eye size={16} />
          Podgląd na danych
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-hidden rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:max-w-5xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-black/10 p-6 pb-5 text-left">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <Eye size={13} />
              Real data preview
            </div>

            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Podgląd raportu na realnych danych
            </DialogTitle>

            <DialogDescription className="max-w-3xl text-sm leading-6 text-[#6b7280]">
              Wybierz zakończoną sesję respondenta zgodną z wersją
              kwestionariusza przypisaną do tego szablonu raportu.
            </DialogDescription>
          </DialogHeader>

          {sessions.length === 0 ? (
            <div className="p-6">
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
                Nie znaleziono zakończonych sesji dla wersji kwestionariusza
                powiązanej z tym szablonem raportu.
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-black/10 p-5">
                <label className="mb-1.5 block text-sm font-medium text-[#171717]">
                  Wyszukaj sesję
                </label>

                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    placeholder="Szukaj po projekcie, respondencie, mailu albo ID sesji..."
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8] p-5">
                {groupedSessions.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
                    Brak sesji pasujących do wyszukiwania.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedSessions.map((group) => (
                      <section
                        key={group.key}
                        className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/75 shadow-sm"
                      >
                        <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold tracking-[-0.02em] text-[#171717]">
                              {group.projectName}
                            </span>

                            <Badge
                              variant="outline"
                              className="rounded-full border-black/10 bg-white/70 text-[#6b7280]"
                            >
                              {group.tenantName}
                            </Badge>

                            <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                              {group.sessions.length} sesji
                            </Badge>
                          </div>
                        </div>

                        <div className="divide-y divide-black/10">
                          {group.sessions.map((session) => {
                            const isSelected =
                              selectedSessionId === session.sessionId;

                            return (
                              <button
                                key={`${session.projectQuestionnaireId}:${session.sessionId}`}
                                type="button"
                                onClick={() =>
                                  setSelectedSessionId(session.sessionId)
                                }
                                className={[
                                  "flex w-full items-start gap-3 px-4 py-4 text-left transition",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
                                  isSelected
                                    ? "bg-[rgba(45,212,191,0.10)]"
                                    : "bg-white/70 hover:bg-white",
                                ].join(" ")}
                              >
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                                  {isSelected ? (
                                    <CheckCircle2 className="h-5 w-5 text-[#0f766e]" />
                                  ) : (
                                    <span className="h-4 w-4 rounded-full border border-black/20 bg-white" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-semibold text-[#171717]">
                                      {session.respondentLabel}
                                    </span>

                                    {session.respondentEmail ? (
                                      <span className="inline-flex items-center gap-1 text-sm text-[#6b7280]">
                                        <UserRound size={13} />
                                        {session.respondentEmail}
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6b7280]">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock3 className="h-3.5 w-3.5" />
                                      zakończono: {formatDateTime(session.completedAt)}
                                    </span>

                                    <span>
                                      rozpoczęto: {formatDateTime(session.startedAt)}
                                    </span>

                                    <span className="font-mono">
                                      sesja: {shortId(session.sessionId)}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-black/10 bg-white/85 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3 text-sm leading-6 text-[#6b7280]">
                    <ShieldCheck
                      size={16}
                      className="mt-1 shrink-0 text-[#0f766e]"
                    />
                    <span>
                      Pokazywane są tylko zakończone sesje zgodne z wersją
                      kwestionariusza przypisaną do tego raportu.
                    </span>
                  </div>

                  {previewHref ? (
                    <Button
                      asChild
                      className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
                    >
                      <Link href={previewHref} target="_blank">
                        <Eye size={16} />
                        Otwórz podgląd
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled
                      className="rounded-full bg-[#171717] text-white"
                    >
                      <Eye size={16} />
                      Otwórz podgląd
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
