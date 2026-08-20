// @humanet-ga4-mp-v1
import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { consentRecords } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export async function hasActiveAnalyticsConsent(
  userId: string,
): Promise<boolean> {
  const rows = await controlDb
    .select({ status: consentRecords.status })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.purpose, "analytics"),
      ),
    )
    .orderBy(desc(consentRecords.createdAt))
    .limit(1);

  return rows[0]?.status === "granted";
}
