"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getMyAssessmentTenantDbBySlug } from "@/features/my-assessment/api/my-assessment-tenant-db";
import { requireSession } from "@/server/auth/require-session";
import {
  normativeProfileFormSchema,
} from "../forms/normative-profile.schema";

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
  return {
    dateOfBirth:
      readText(
        formData,
        "dateOfBirth",
      ),
    sex:
      readText(formData, "sex"),
    countryCode:
      readText(
        formData,
        "countryCode",
      ) || "PL",
    voivodeshipCode:
      readText(
        formData,
        "voivodeshipCode",
      ),
    localitySize:
      readText(
        formData,
        "localitySize",
      ),
    educationLevel:
      readText(
        formData,
        "educationLevel",
      ),
    educationFields:
      readStringArray(
        formData,
        "educationFields",
      ),
    employmentStatus:
      readText(
        formData,
        "employmentStatus",
      ),
    industryCode:
      readText(
        formData,
        "industryCode",
      ),
    jobLevel:
      readText(
        formData,
        "jobLevel",
      ),
    jobFunction:
      readText(
        formData,
        "jobFunction",
      ),
    organizationSize:
      readText(
        formData,
        "organizationSize",
      ),
    employmentSector:
      readText(
        formData,
        "employmentSector",
      ),
    consentAccepted:
      formData.get(
        "consentAccepted",
      ) === "on",
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

const EMPLOYMENT_STATUSES_WITHOUT_CURRENT_JOB = new Set([
  "unemployed",
  "retired",
]);




export async function completeNormativeProfileAction(
  previousState:
    CompleteNormativeProfileActionState,
  formData: FormData,
): Promise<CompleteNormativeProfileActionState> {
  const values =
    readFormValues(formData);
const normalizedValues =
  EMPLOYMENT_STATUSES_WITHOUT_CURRENT_JOB.has(
    values.employmentStatus,
  )
    ? {
        ...values,
        industryCode: "not_applicable",
        jobLevel: "not_applicable",
        jobFunction: "not_applicable",
        organizationSize: "not_applicable",
        employmentSector: "not_applicable",
      }
    : values;
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

    const result =
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

    revalidatePath(
      `/my/assessment/sessions/${assessmentSessionId}/completed`,
    );

return {
  status: "success",
  message:
    mode === "update"
      ? "Dane zostały zaktualizowane. Nie utworzono nowego kodu rabatowego."
      : "Dziękujemy. Dane zostały zapisane, a rabat przyznany.",

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
  } catch (error) {
    return buildErrorState({
      previousState,
      values: normalizedValues,
      message:
        error instanceof Error &&
        error.message
          ? error.message
          : "Nie udało się zapisać danych. Spróbuj ponownie.",
    });
  }
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
