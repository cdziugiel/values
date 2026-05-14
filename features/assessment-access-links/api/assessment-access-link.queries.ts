import { and, desc, eq, isNull } from "drizzle-orm";

import { assessmentAccessLinks } from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

export async function findActiveAccessLinkByProjectRespondent({
  db,
  projectRespondentId,
}: {
  db: TenantDb;
  projectRespondentId: string;
}) {
  return db.query.assessmentAccessLinks.findFirst({
    where: and(
      eq(assessmentAccessLinks.projectRespondentId, projectRespondentId),
      eq(assessmentAccessLinks.status, "active"),
      isNull(assessmentAccessLinks.deletedAt),
    ),
    orderBy: desc(assessmentAccessLinks.createdAt),
  });
}