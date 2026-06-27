import { randomBytes } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { discountCodes } from "@/drizzle/schema/control";
import { controlDb } from "@/server/db/control-db";

import { hashDiscountCode } from "../lib/discount-code-hash";
import { createDiscountCodePreview } from "../lib/discount-code-normalize";

const SOURCE_TYPE = "normative_profile_reward" as const;
const CODE_PREFIX = "NORM";
const DEFAULT_DISCOUNT_PERCENT_BPS = 10000;
const DEFAULT_VALIDITY_DAYS = 30;
const DEFAULT_USAGE_LIMIT = 4;
const MAX_GENERATION_ATTEMPTS = 8;

function createReadableCode(): string {
  const raw = randomBytes(8).toString("hex").toUpperCase();

  return `${CODE_PREFIX}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export type IssueNormativeDiscountCodeInput = {
  rewardId: string;
  assignedUserId: string;
  actorUserId: string;
  assessmentSessionId: string;
  discountPercentBps?: number;
  validityDays?: number;
  usageLimit?: number;
};

export type IssuedNormativeDiscountCode = {
  discountCodeId: string;
  code: string | null;
  codePreview: string;
  expiresAt: Date | null;
  alreadyExisted: boolean;
};

export async function issueNormativeDiscountCode(
  input: IssueNormativeDiscountCodeInput,
): Promise<IssuedNormativeDiscountCode> {
  const [existing] = await controlDb
    .select({
      id: discountCodes.id,
      codePreview: discountCodes.codePreview,
      endsAt: discountCodes.endsAt,
      assignedUserId: discountCodes.assignedUserId,
    })
    .from(discountCodes)
    .where(
      and(
        eq(discountCodes.sourceType, SOURCE_TYPE),
        eq(discountCodes.sourceReferenceId, input.rewardId),
        isNull(discountCodes.deletedAt),
      ),
    )
    .limit(1);

  if (existing) {
    if (
      existing.assignedUserId &&
      existing.assignedUserId !== input.assignedUserId
    ) {
      throw new Error(
        "Kod rabatowy jest przypisany do innego użytkownika.",
      );
    }

    return {
      discountCodeId: existing.id,
      code: null,
      codePreview: existing.codePreview,
      expiresAt: existing.endsAt,
      alreadyExisted: true,
    };
  }

  const now = new Date();
  const expiresAt = addDays(
    now,
    input.validityDays ?? DEFAULT_VALIDITY_DAYS,
  );
  const usageLimit =
    input.usageLimit ?? DEFAULT_USAGE_LIMIT;

  for (
    let attempt = 0;
    attempt < MAX_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    const code = createReadableCode();
    const codeHash = hashDiscountCode(code);
    const codePreview = createDiscountCodePreview(code);

    try {
      const [created] = await controlDb
        .insert(discountCodes)
        .values({
          codeHash,
          codePreview,
          name: "Rabat za udział w badaniu normatywnym",
          description:
            `Kod za uzupełnienie profilu statystycznego. ` +
            `Sesja źródłowa: ${input.assessmentSessionId}.`,
          status: "active",
          discountType: "percent",
          discountPercentBps:
            input.discountPercentBps ??
            DEFAULT_DISCOUNT_PERCENT_BPS,
          discountValueCents: null,
          allowZeroFinalPrice: true,
          maximumDiscountCents: null,
          minimumOrderValueCents: null,
          appliesTo: "all_report_access",
          startsAt: now,
          endsAt: expiresAt,
          maxRedemptions: usageLimit,
          maxRedemptionsPerUser: usageLimit,
          maxRedemptionsPerTenant: null,
          assignedUserId: input.assignedUserId,
          sourceType: SOURCE_TYPE,
          sourceReferenceId: input.rewardId,
          createdBy: input.actorUserId,
          updatedBy: input.actorUserId,
        })
        .returning({
          id: discountCodes.id,
          codePreview: discountCodes.codePreview,
          endsAt: discountCodes.endsAt,
        });

      return {
        discountCodeId: created.id,
        code,
        codePreview: created.codePreview,
        expiresAt: created.endsAt,
        alreadyExisted: false,
      };
    } catch (error) {
      const [createdByConcurrentRequest] =
        await controlDb
          .select({
            id: discountCodes.id,
            codePreview:
              discountCodes.codePreview,
            endsAt: discountCodes.endsAt,
          })
          .from(discountCodes)
          .where(
            and(
              eq(
                discountCodes.sourceType,
                SOURCE_TYPE,
              ),
              eq(
                discountCodes.sourceReferenceId,
                input.rewardId,
              ),
              isNull(discountCodes.deletedAt),
            ),
          )
          .limit(1);

      if (createdByConcurrentRequest) {
        return {
          discountCodeId:
            createdByConcurrentRequest.id,
          code: null,
          codePreview:
            createdByConcurrentRequest.codePreview,
          expiresAt:
            createdByConcurrentRequest.endsAt,
          alreadyExisted: true,
        };
      }

      if (
        attempt ===
        MAX_GENERATION_ATTEMPTS - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error(
    "Nie udało się utworzyć unikalnego kodu rabatowego.",
  );
}
