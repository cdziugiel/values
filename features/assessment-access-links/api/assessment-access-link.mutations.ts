import { and, eq, isNull } from "drizzle-orm";

import {
  assessmentAccessLinks,
  assessmentProjectRespondents,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantDb } from "@/server/db/tenant-db";
import {
  generateAssessmentAccessToken,
  hashAssessmentAccessToken,
} from "@/server/security/assessment-token";
import type { TenantContext } from "@/server/tenant/tenant-context.types";
import { env } from "@/shared/config/env";

import {
  createAssessmentAccessLinkSchema,
  revokeAssessmentAccessLinkSchema,
  type CreateAssessmentAccessLinkInput,
  type RevokeAssessmentAccessLinkInput,
} from "../forms/assessment-access-link.schema";

function buildAssessmentUrl(token: string) {
  const baseUrl = env.APP_URL || env.NEXTAUTH_URL;
  return `${baseUrl.replace(/\/$/, "")}/a/${token}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function createAssessmentAccessLink({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: CreateAssessmentAccessLinkInput;
}) {
  const parsed = createAssessmentAccessLinkSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid assessment access link input.");
  }

  const projectRespondent =
    await db.query.assessmentProjectRespondents.findFirst({
      where: and(
        eq(
          assessmentProjectRespondents.id,
          parsed.data.projectRespondentId,
        ),
        eq(
          assessmentProjectRespondents.assessmentProjectId,
          parsed.data.assessmentProjectId,
        ),
        isNull(assessmentProjectRespondents.deletedAt),
      ),
    });

  if (!projectRespondent) {
    throw new Error("Project respondent not found.");
  }

  const now = new Date();

  await db
    .update(assessmentAccessLinks)
    .set({
      status: "revoked",
      revokedAt: now,
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(
          assessmentAccessLinks.projectRespondentId,
          projectRespondent.id,
        ),
        eq(assessmentAccessLinks.status, "active"),
        isNull(assessmentAccessLinks.deletedAt),
      ),
    );

  const token = generateAssessmentAccessToken();
  const tokenHash = hashAssessmentAccessToken(token);
  const expiresAt = addDays(now, 30);

  const [accessLink] = await db
    .insert(assessmentAccessLinks)
    .values({
      assessmentProjectId: projectRespondent.assessmentProjectId,
      respondentId: projectRespondent.respondentId,
      projectRespondentId: projectRespondent.id,
      tokenHash,
      status: "active",
      expiresAt,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_access_link_created",
    entityType: "assessment_access_link",
    entityId: accessLink.id,
    after: {
      assessmentProjectId: accessLink.assessmentProjectId,
      respondentId: accessLink.respondentId,
      projectRespondentId: accessLink.projectRespondentId,
      status: accessLink.status,
      expiresAt: accessLink.expiresAt,
    },
  });

  return {
    accessLink,
    token,
    url: buildAssessmentUrl(token),
  };
}

export async function revokeAssessmentAccessLink({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: RevokeAssessmentAccessLinkInput;
}) {
  const parsed = revokeAssessmentAccessLinkSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid revoke access link input.");
  }

  const existing = await db.query.assessmentAccessLinks.findFirst({
    where: and(
      eq(assessmentAccessLinks.id, parsed.data.accessLinkId),
      eq(
        assessmentAccessLinks.assessmentProjectId,
        parsed.data.assessmentProjectId,
      ),
      isNull(assessmentAccessLinks.deletedAt),
    ),
  });

  if (!existing) {
    throw new Error("Assessment access link not found.");
  }

  const now = new Date();

  const [revoked] = await db
    .update(assessmentAccessLinks)
    .set({
      status: "revoked",
      revokedAt: now,
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(eq(assessmentAccessLinks.id, parsed.data.accessLinkId))
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "assessment_access_link_revoked",
    entityType: "assessment_access_link",
    entityId: revoked.id,
    before: {
      status: existing.status,
      expiresAt: existing.expiresAt,
    },
    after: {
      status: revoked.status,
      revokedAt: revoked.revokedAt,
      deletedAt: revoked.deletedAt,
    },
  });

  return revoked;
}