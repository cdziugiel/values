import { and, eq, isNull } from "drizzle-orm";

import {
  clientOrganizations,
  clientUnits,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import type { TenantDb } from "@/server/db/tenant-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";

import {
  archiveRespondentSchema,
  createRespondentSchema,
  updateRespondentSchema,
  type ArchiveRespondentInput,
  type CreateRespondentInput,
  type UpdateRespondentInput,
} from "../forms/respondent.schema";

function normalizeOptional(value: string | undefined | null) {
  const normalized = value?.trim().toLowerCase();;
  return normalized ? normalized : null;
}

function normalizeOptionalUuid(value: string | undefined | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function ensureOrganizationExists({
  db,
  clientOrganizationId,
}: {
  db: TenantDb;
  clientOrganizationId: string | null;
}) {
  if (!clientOrganizationId) {
    return null;
  }

  const organization = await db.query.clientOrganizations.findFirst({
    where: and(
      eq(clientOrganizations.id, clientOrganizationId),
      isNull(clientOrganizations.deletedAt),
    ),
  });

  if (!organization) {
    throw new Error("Client organization not found.");
  }

  return organization;
}

async function ensureUnitExists({
  db,
  clientUnitId,
  clientOrganizationId,
}: {
  db: TenantDb;
  clientUnitId: string | null;
  clientOrganizationId: string | null;
}) {
  if (!clientUnitId) {
    return null;
  }

  const unit = await db.query.clientUnits.findFirst({
    where: and(
      eq(clientUnits.id, clientUnitId),
      isNull(clientUnits.deletedAt),
    ),
  });

  if (!unit) {
    throw new Error("Client unit not found.");
  }

  if (clientOrganizationId && unit.clientOrganizationId !== clientOrganizationId) {
    throw new Error("Client unit does not belong to selected organization.");
  }

  return unit;
}

async function getRespondentWithIdentity({
  db,
  respondentId,
}: {
  db: TenantDb;
  respondentId: string;
}) {
  const respondent = await db.query.respondents.findFirst({
    where: and(eq(respondents.id, respondentId), isNull(respondents.deletedAt)),
  });

  if (!respondent) {
    return null;
  }

  const identity = await db.query.respondentIdentities.findFirst({
    where: and(
      eq(respondentIdentities.respondentId, respondentId),
      isNull(respondentIdentities.deletedAt),
    ),
  });

  return {
    respondent,
    identity,
  };
}

export async function createRespondent({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: CreateRespondentInput;
}) {
  const parsed = createRespondentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid respondent input.");
  }

  const clientOrganizationId = normalizeOptionalUuid(
    parsed.data.clientOrganizationId,
  );
  const clientUnitId = normalizeOptionalUuid(parsed.data.clientUnitId);

  await ensureOrganizationExists({
    db,
    clientOrganizationId,
  });

  await ensureUnitExists({
    db,
    clientUnitId,
    clientOrganizationId,
  });

  const [respondent] = await db
    .insert(respondents)
    .values({
      externalCode: normalizeOptional(parsed.data.externalCode),
      clientOrganizationId,
      clientUnitId,
      metadata: {},
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  const [identity] = await db
    .insert(respondentIdentities)
    .values({
      respondentId: respondent.id,
      email: normalizeOptional(parsed.data.email),
      firstName: normalizeOptional(parsed.data.firstName),
      lastName: normalizeOptional(parsed.data.lastName),
      phone: normalizeOptional(parsed.data.phone),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await writeTenantAuditLog({
    db,
    ctx,
    action: "respondent_created",
    entityType: "respondent",
    entityId: respondent.id,
    after: {
      respondent: {
        externalCode: respondent.externalCode,
        clientOrganizationId: respondent.clientOrganizationId,
        clientUnitId: respondent.clientUnitId,
      },
      identity: {
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
      },
    },
  });

  return respondent;
}

export async function updateRespondent({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: UpdateRespondentInput;
}) {
  const parsed = updateRespondentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid respondent update input.");
  }

  const existing = await getRespondentWithIdentity({
    db,
    respondentId: parsed.data.respondentId,
  });

  if (!existing) {
    throw new Error("Respondent not found.");
  }

  const clientOrganizationId = normalizeOptionalUuid(
    parsed.data.clientOrganizationId,
  );
  const clientUnitId = normalizeOptionalUuid(parsed.data.clientUnitId);

  await ensureOrganizationExists({
    db,
    clientOrganizationId,
  });

  await ensureUnitExists({
    db,
    clientUnitId,
    clientOrganizationId,
  });

  const [updatedRespondent] = await db
    .update(respondents)
    .set({
      externalCode: normalizeOptional(parsed.data.externalCode),
      clientOrganizationId,
      clientUnitId,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(respondents.id, parsed.data.respondentId))
    .returning();

  const existingIdentity = existing.identity;

  if (existingIdentity) {
    await db
      .update(respondentIdentities)
      .set({
        email: normalizeOptional(parsed.data.email),
        firstName: normalizeOptional(parsed.data.firstName),
        lastName: normalizeOptional(parsed.data.lastName),
        phone: normalizeOptional(parsed.data.phone),
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(eq(respondentIdentities.id, existingIdentity.id));
  } else {
    await db.insert(respondentIdentities).values({
      respondentId: updatedRespondent.id,
      email: normalizeOptional(parsed.data.email),
      firstName: normalizeOptional(parsed.data.firstName),
      lastName: normalizeOptional(parsed.data.lastName),
      phone: normalizeOptional(parsed.data.phone),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  await writeTenantAuditLog({
    db,
    ctx,
    action: "respondent_updated",
    entityType: "respondent",
    entityId: updatedRespondent.id,
    before: {
      respondent: {
        externalCode: existing.respondent.externalCode,
        clientOrganizationId: existing.respondent.clientOrganizationId,
        clientUnitId: existing.respondent.clientUnitId,
      },
      identity: existing.identity
        ? {
            email: existing.identity.email,
            firstName: existing.identity.firstName,
            lastName: existing.identity.lastName,
          }
        : null,
    },
    after: {
      respondent: {
        externalCode: updatedRespondent.externalCode,
        clientOrganizationId: updatedRespondent.clientOrganizationId,
        clientUnitId: updatedRespondent.clientUnitId,
      },
      identity: {
        email: normalizeOptional(parsed.data.email),
        firstName: normalizeOptional(parsed.data.firstName),
        lastName: normalizeOptional(parsed.data.lastName),
      },
    },
  });

  return updatedRespondent;
}

export async function archiveRespondent({
  db,
  ctx,
  input,
}: {
  db: TenantDb;
  ctx: TenantContext;
  input: ArchiveRespondentInput;
}) {
  const parsed = archiveRespondentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid respondent archive input.");
  }

  const existing = await getRespondentWithIdentity({
    db,
    respondentId: parsed.data.respondentId,
  });

  if (!existing) {
    throw new Error("Respondent not found.");
  }

  const now = new Date();

  const [archivedRespondent] = await db
    .update(respondents)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(eq(respondents.id, parsed.data.respondentId))
    .returning();

  if (existing.identity) {
    await db
      .update(respondentIdentities)
      .set({
        deletedAt: now,
        updatedBy: ctx.userId,
        updatedAt: now,
      })
      .where(eq(respondentIdentities.id, existing.identity.id));
  }

  await writeTenantAuditLog({
    db,
    ctx,
    action: "respondent_archived",
    entityType: "respondent",
    entityId: archivedRespondent.id,
    before: {
      respondent: {
        externalCode: existing.respondent.externalCode,
        clientOrganizationId: existing.respondent.clientOrganizationId,
        clientUnitId: existing.respondent.clientUnitId,
      },
      identity: existing.identity
        ? {
            email: existing.identity.email,
            firstName: existing.identity.firstName,
            lastName: existing.identity.lastName,
          }
        : null,
    },
    after: {
      deletedAt: archivedRespondent.deletedAt,
    },
  });

  return archivedRespondent;
}