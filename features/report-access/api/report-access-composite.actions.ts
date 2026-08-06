"use server";

import { getCompositeReportAccessOfferForCurrentUser } from "./report-access.queries";
import {
  redeemCompositeReportAccessCodeAction as redeemCompositeReportAccessCodeActionBase,
  unlockCompositeReportAccessAction as unlockCompositeReportAccessActionBase,
  unlockCompositeReportWithPlaceholderPaymentAction as unlockCompositeReportWithPlaceholderPaymentActionBase,
  type ReportAccessActionState,
} from "./report-access.actions";

function readTenantSlugs(formData: FormData) {
  const tenantSlug = String(
    formData.get("tenantSlug") ?? "",
  ).trim();

  return Array.from(
    new Set(
      [
        tenantSlug,
        ...formData
          .getAll("tenantSlugs")
          .map((value) => String(value).trim()),
      ].filter(Boolean),
    ),
  );
}

async function resolveExistingCompositeGrantState(
  formData: FormData,
): Promise<ReportAccessActionState | null> {
  const tenantSlugs = readTenantSlugs(formData);
  const reportTemplateVersionId = String(
    formData.get("reportTemplateVersionId") ?? "",
  ).trim();

  if (tenantSlugs.length === 0 || !reportTemplateVersionId) {
    return null;
  }

  const offer = await getCompositeReportAccessOfferForCurrentUser({
    tenantSlug: tenantSlugs[0],
    tenantSlugs,
    reportTemplateVersionId,
  });

  if (!offer.ok || !offer.existingGrant) {
    return null;
  }

  return {
    status: "error",
    message:
      "Ten raport został już odblokowany dla obecnych wyników. Aby utworzyć nowy raport, ponownie ukończ wszystkie wymagane kwestionariusze.",
  };
}

export async function unlockCompositeReportAccessAction(
  previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  const existingGrantState =
    await resolveExistingCompositeGrantState(formData);

  if (existingGrantState) {
    return existingGrantState;
  }

  return unlockCompositeReportAccessActionBase(
    previousState,
    formData,
  );
}

export async function redeemCompositeReportAccessCodeAction(
  previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  const existingGrantState =
    await resolveExistingCompositeGrantState(formData);

  if (existingGrantState) {
    return existingGrantState;
  }

  return redeemCompositeReportAccessCodeActionBase(
    previousState,
    formData,
  );
}

export async function unlockCompositeReportWithPlaceholderPaymentAction(
  previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  const existingGrantState =
    await resolveExistingCompositeGrantState(formData);

  if (existingGrantState) {
    return existingGrantState;
  }

  return unlockCompositeReportWithPlaceholderPaymentActionBase(
    previousState,
    formData,
  );
}
