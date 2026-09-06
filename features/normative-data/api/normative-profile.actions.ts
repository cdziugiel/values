"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getMyAssessmentTenantDbBySlug } from "@/features/my-assessment/api/my-assessment-tenant-db";
import { dispatchAssessmentFunnelEvent } from "@/features/analytics/server/assessment-funnel.analytics";
import { requireSession } from "@/server/auth/require-session";
import {
  normativeProfileFormSchema,
} from "../forms/normative-profile.schema";
import {
  mapEmploymentFormToLegacyStatus,
  mapOwnershipToLegacySector,
  mapPkd2025ToLegacyIndustry,
  resolveIsWorkingForNorms,
} from "../lib/normative-profile-derived";
// @humanet-normative-profile-v1_1-actions
import { redirect } from "next/navigation";

import type {
  ClaimNormativeRewardActionState,
  CompleteNormativeProfileActionState,
  NormativeProfileFormValues,
} from "../types/normative-profile-action.types";
import {
  claimAnnualNormativeReward,
  completeNormativeProfile,
} from "./normative-profile.mutations";

function readText(
  formData: FormData,
  name: string,
): string {
  const value = formData.get(name);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function readStringArray(
  formData: FormData,
  name: string,
): string[] {
  return formData
    .getAll(name)
    .filter(
      (value): value is string =>
        typeof value === "string",
    )
    .map((value) => value.trim())
    .filter(Boolean);
}

function readFormValues(
  formData: FormData,
): NormativeProfileFormValues {
  const workedLastWeek = readText(formData, "workedLastWeek");
  const hasJobTemporaryAbsence = readText(formData, "hasJobTemporaryAbsence");
  const isWorkingForNorms = resolveIsWorkingForNorms(
    workedLastWeek,
    hasJobTemporaryAbsence,
  );
  const employmentForm = readText(formData, "employmentForm") || "not_applicable";
  const industrySection = readText(formData, "industrySection") || "not_applicable";
  const ownershipSector = readText(formData, "ownershipSector") || "not_applicable";

  return {
    dateOfBirth: readText(formData, "dateOfBirth"),
    sex: readText(formData, "sex"),
    countryCode: readText(formData, "countryCode") || "PL",
    voivodeshipCode: readText(formData, "voivodeshipCode"),
    localitySize: readText(formData, "localitySize"),
    educationLevel: readText(formData, "educationLevel"),
    educationFields: readStringArray(formData, "educationFields"),

    workedLastWeek,
    hasJobTemporaryAbsence,
    isWorkingForNorms,
    employmentForm,
    workTime: readText(formData, "workTime") || "not_applicable",
    industrySection,
    occupationMajorGroup: readText(formData, "occupationMajorGroup") || "not_applicable",
    managesPeople: readText(formData, "managesPeople") || "not_applicable",
    ownershipSector,
    organizationTenure: readText(formData, "organizationTenure") || "not_applicable",
    jobLevel: readText(formData, "jobLevel") || "not_applicable",
    jobFunction: readText(formData, "jobFunction") || "not_applicable",
    organizationSize: readText(formData, "organizationSize") || "not_applicable",

    // Legacy compatibility — wartości nie pochodzą już bezpośrednio od respondenta.
    employmentStatus: mapEmploymentFormToLegacyStatus(
      employmentForm,
      isWorkingForNorms,
    ),
    industryCode: mapPkd2025ToLegacyIndustry(industrySection),
    employmentSector: mapOwnershipToLegacySector(ownershipSector),

    consentAccepted: formData.get("consentAccepted") === "on",
  };
}

function buildErrorState({
  previousState,
  values,
  message,
}: {
  previousState:
    CompleteNormativeProfileActionState;
  values: NormativeProfileFormValues;
  message: string;
}): CompleteNormativeProfileActionState {
  return {
    status: "error",
    message,
    values,
    formVersion:
      previousState.formVersion + 1,
  };
}

async function resolveRequestContext(
  tenantSlug: string,
) {
  const authSession =
    await requireSession();

  if (
    !authSession.user?.id ||
    !authSession.user.email
  ) {
    throw new Error(
      "Nie udało się potwierdzić Twojego konta. Zaloguj się ponownie.",
    );
  }

  const tenantContext =
    await getMyAssessmentTenantDbBySlug(
      tenantSlug,
    );

  if (!tenantContext) {
    throw new Error(
      "Nie udało się odnaleźć aktywnego środowiska badania.",
    );
  }

  const requestHeaders =
    await headers();

  const forwardedFor =
    requestHeaders.get(
      "x-forwarded-for",
    );

  const ipAddress =
    forwardedFor
      ?.split(",")[0]
      ?.trim() ||
    requestHeaders.get("x-real-ip") ||
    null;

  return {
    authSession,
    db: tenantContext.db,
    tenantId: tenantContext.tenantId,
    ipAddress,
    userAgent:
      requestHeaders.get("user-agent"),
  };
}

// v1.1: status pracy jest wyliczany z dwustopniowego screenera.



function resolveSafeCompletedRedirect({
  redirectTo,
  assessmentSessionId,
}: {
  redirectTo: string;
  assessmentSessionId: string;
}) {
  if (!redirectTo) {
    return null;
  }

  const expectedPath =
    `/my/assessment/sessions/${assessmentSessionId}/completed`;

  try {
    const url =
      new URL(
        redirectTo,
        "http://humanet.local",
      );

    if (url.origin !== "http://humanet.local") {
      return null;
    }

    if (url.pathname !== expectedPath) {
      return null;
    }

    return `${url.pathname}${url.search}#basic-feedback`;
  } catch {
    return null;
  }
}

export async function completeNormativeProfileAction(
  previousState:
    CompleteNormativeProfileActionState,
  formData: FormData,
): Promise<CompleteNormativeProfileActionState> {
  const values =
    readFormValues(formData);


    const redirectTo =
  readText(
    formData,
    "redirectTo",
  );
const normalizedValues = values;
  const tenantSlug =
    readText(
      formData,
      "tenantSlug",
    );
  const assessmentSessionId =
    readText(
      formData,
      "assessmentSessionId",
    );
  const mode =
    readText(formData, "mode") ===
    "update"
      ? "update"
      : "create";

  if (
    !tenantSlug ||
    !assessmentSessionId
  ) {
    return buildErrorState({
      previousState,
      values: normalizedValues,
      message:
        "Brakuje danych sesji badania.",
    });
  }

const parsedInput =
  normativeProfileFormSchema.safeParse({
    tenantSlug,
    assessmentSessionId,
    ...normalizedValues,
  });

if (!parsedInput.success) {
  return {
    status: "error",
    message:
      "Sprawdź poprawność danych w formularzu.",
    fieldErrors:
      parsedInput.error.flatten()
        .fieldErrors,
    values: normalizedValues,
    formVersion:
      previousState.formVersion + 1,
  };
}

let result: Awaited<
  ReturnType<
    typeof completeNormativeProfile
  >
>;

try {
  const {
    authSession,
    db,
    tenantId,
    ipAddress,
    userAgent,
  } =
    await resolveRequestContext(
      tenantSlug,
    );

  result =
    await completeNormativeProfile({
      db,
      tenantId,
      userId:
        authSession.user.id,
      userEmail:
        authSession.user.email!,
      mode,
      ipAddress,
      userAgent,
      input: parsedInput.data,
    });

  // @humanet-funnel-analytics-v1
  // "create" + accepted consent is the authoritative first join to the research dataset.
  if (mode === "create" && normalizedValues.consentAccepted) {
    await dispatchAssessmentFunnelEvent({
      userId: authSession.user.id,
      name: "join_research_program",
      surface: "normative_profile",
    });
  }
} catch (error) {
  console.error(
    "completeNormativeProfileAction failed:",
    error,
  );

  return buildErrorState({
    previousState,
    values: normalizedValues,
    message:
      "Nie udało się zapisać danych. Spróbuj ponownie.",
  });
}

revalidatePath(
  `/my/assessment/sessions/${assessmentSessionId}/completed`,
);

const safeRedirect =
  resolveSafeCompletedRedirect({
    redirectTo,
    assessmentSessionId,
  });

if (safeRedirect) {
  redirect(safeRedirect);
}

return {
  status: "success",
  message:
    mode === "update"
      ? "Dane zostały zaktualizowane."
      : "Dane zostały zapisane.",

  formVersion:
    previousState.formVersion,

  values: {
    ...result.profile,
    consentAccepted: true,
  },

  profile:
    result.profile,

  reward:
    result.reward,
};
}

export async function claimNormativeRewardAction(
  _previousState:
    ClaimNormativeRewardActionState,
  formData: FormData,
): Promise<ClaimNormativeRewardActionState> {
  const tenantSlug =
    readText(
      formData,
      "tenantSlug",
    );
  const assessmentSessionId =
    readText(
      formData,
      "assessmentSessionId",
    );

  if (
    !tenantSlug ||
    !assessmentSessionId
  ) {
    return {
      status: "error",
      message:
        "Brakuje danych sesji badania.",
    };
  }

  try {
    const {
      authSession,
      db,
      tenantId,
      ipAddress,
      userAgent,
    } =
      await resolveRequestContext(
        tenantSlug,
      );

    const reward =
      await claimAnnualNormativeReward({
        db,
        tenantId,
        userId:
          authSession.user.id,
        userEmail:
          authSession.user.email!,
        assessmentSessionId,
        ipAddress,
        userAgent,
      });

    revalidatePath(
      `/my/assessment/sessions/${assessmentSessionId}/completed`,
    );

    const issuedNow =
      Boolean(reward.discountCode);

    return {
      status: "success",
      message: issuedNow
        ? "Nowy kod rabatowy został wydany."
        : "Nowy kod będzie dostępny po upływie 12 miesięcy od poprzedniego wydania.",
      reward,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error &&
        error.message
          ? error.message
          : "Nie udało się wydać kodu rabatowego.",
    };
  }
}
