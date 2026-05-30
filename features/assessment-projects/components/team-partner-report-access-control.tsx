"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GrantPartnerReportAccessForm } from "./grant-partner-report-access-form";

type ClientUnitOption = {
  id: string;
  name: string;
  parentId?: string | null;
  type?: string | null;
};

type TeamPartnerReportAccessControlProps = {
  tenantSlug: string;
  projectId: string;
  report: any;
  units: ClientUnitOption[];
};



export function TeamPartnerReportAccessControl({
  tenantSlug,
  projectId,
  report,
  units,
}: TeamPartnerReportAccessControlProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id ?? "");

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) ?? null,
    [units, selectedUnitId],
  );

  const existingGrantForSelectedUnit =
    report.teamGrants?.find(
      (grant: any) =>
        grant.subjectType === "client_unit" &&
        grant.subjectId === selectedUnitId,
    ) ?? null;

const href = existingGrantForSelectedUnit?.href ?? null;

  if (!units.length) {
    return (
      <div className="max-w-72 text-right text-sm leading-6 text-[#6b7280]">
        Brak jednostek organizacyjnych dla tego projektu.
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-end gap-2">
      <label className="w-full space-y-1">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#6b7280]">
          <Building2 size={13} />
          Jednostka / zespół
        </span>

        <select
          value={selectedUnitId}
          onChange={(event) => setSelectedUnitId(event.target.value)}
          className="h-9 w-full rounded-full border border-black/10 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
        >
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </label>

      {existingGrantForSelectedUnit && href ? (
        <Button
          asChild
          size="sm"
          className="w-full rounded-full bg-[#171717] text-white shadow-sm hover:bg-[#2a2a2a]"
        >
          <Link href={href}>Otwórz raport</Link>
        </Button>
      ) : report.product && selectedUnit ? (
        <GrantPartnerReportAccessForm
          tenantSlug={tenantSlug}
          assessmentProjectId={projectId}
          productId={report.product.id}
          reportTemplateVersionId={report.reportTemplateVersionId}
          reportTemplateKind={report.reportTemplateKind}
          subjectType="client_unit"
          subjectId={selectedUnit.id}
          disabled={!report.canGrant}
        />
      ) : (
        <Button disabled variant="outline" size="sm" className="w-full rounded-full">
          Wybierz zakres
        </Button>
      )}

      {!existingGrantForSelectedUnit && report.availableCount <= 0 ? (
        <p className="text-right text-xs leading-5 text-amber-800">
          Brak wolnych dostępów dla raportu zespołu.
        </p>
      ) : null}
    </div>
  );
}