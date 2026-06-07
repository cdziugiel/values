import { and, count, desc, eq, isNull, lt, ne } from "drizzle-orm";

import {
  discountCodeRedemptions,
  discountCodes,
} from "@/drizzle/schema/control";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

export type DiscountCodeAdminListItem = {
  id: string;
  codePreview: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "archived";
  discountType: "fixed_amount" | "percent";
  discountValueCents: number | null;
  discountPercentBps: number | null;
  allowZeroFinalPrice: boolean;
  maximumDiscountCents: number | null;
  minimumOrderValueCents: number | null;
  appliesTo: "report_unlock" | "report_access_purchase" | "all_report_access";
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number | null;
  maxRedemptionsPerTenant: number | null;
  redeemedCount: number;
  createdAt: Date;
};

async function archiveExpiredDiscountCodes() {
  const now = new Date();

  await controlDb
    .update(discountCodes)
    .set({
      status: "archived",
      updatedAt: now,
    })
    .where(
      and(
        isNull(discountCodes.deletedAt),
        ne(discountCodes.status, "archived"),
        lt(discountCodes.endsAt, now),
      ),
    );
}

export async function listDiscountCodesForAdmin(): Promise<
  DiscountCodeAdminListItem[]
> {
  await requireSuperAdmin();

  await archiveExpiredDiscountCodes();

  const rows = await controlDb
    .select()
    .from(discountCodes)
    .where(isNull(discountCodes.deletedAt))
    .orderBy(desc(discountCodes.createdAt));

  const result: DiscountCodeAdminListItem[] = [];

  for (const row of rows) {
    const [usage] = await controlDb
      .select({ value: count() })
      .from(discountCodeRedemptions)
      .where(
        and(
          eq(discountCodeRedemptions.discountCodeId, row.id),
          eq(discountCodeRedemptions.status, "redeemed"),
        ),
      );

    result.push({
      id: row.id,
      codePreview: row.codePreview,
      name: row.name,
      description: row.description,
      status: row.status,
      discountType: row.discountType,
      discountValueCents: row.discountValueCents,
      discountPercentBps: row.discountPercentBps,
      allowZeroFinalPrice: row.allowZeroFinalPrice,
      maximumDiscountCents: row.maximumDiscountCents,
      minimumOrderValueCents: row.minimumOrderValueCents,
      appliesTo: row.appliesTo,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      maxRedemptions: row.maxRedemptions,
      maxRedemptionsPerUser: row.maxRedemptionsPerUser,
      maxRedemptionsPerTenant: row.maxRedemptionsPerTenant,
      redeemedCount: usage?.value ?? 0,
      createdAt: row.createdAt,
    });
  }

  return result;
}