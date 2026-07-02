import { and, eq, isNull, ne } from "drizzle-orm";

import {
  clientOrganizations,
  clientUnits,
  respondentIdentities,
  respondents,
  clientUnitMemberships
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
import {
  deactivateRespondentIdentityIndex,
  upsertRespondentIdentityIndex,
} from "@/server/respondents/respondent-identity-index";


function normalizeRole(value: string | undefined | null) {
  const normalized = value?.trim();

  return normalized || "member";
}

async function syncPrimaryUnitMembership({
  db,
  ctx,
  respondentId,
  clientUnitId,
  role,
  isLeader,
}: {
  db: TenantDb;
  ctx: TenantContext;
  respondentId: string;
  clientUnitId: string | null;
  role: string | undefined | null;
  isLeader: boolean;
}) {
  const now = new Date();

  if (!clientUnitId) {
    await db
      .update(clientUnitMemberships)
      .set({
        deletedAt: now,
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(
        and(
          eq(clientUnitMemberships.respondentId, respondentId),
          isNull(clientUnitMemberships.deletedAt),
        ),
      );

    return;
  }

  const existingMembership = await db.query.clientUnitMemberships.findFirst({
    where: and(
      eq(clientUnitMemberships.respondentId, respondentId),
      eq(clientUnitMemberships.clientUnitId, clientUnitId),
      isNull(clientUnitMemberships.deletedAt),
    ),
    columns: {
      id: true,
    },
  });

  if (existingMembership) {
    await db
      .update(clientUnitMemberships)
      .set({
        deletedAt: now,
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(
        and(
          eq(clientUnitMemberships.respondentId, respondentId),
          isNull(clientUnitMemberships.deletedAt),
          ne(clientUnitMemberships.id, existingMembership.id),
        ),
      );

    await db
      .update(clientUnitMemberships)
      .set({
        role: normalizeRole(role),
        isLeader,
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(eq(clientUnitMemberships.id, existingMembership.id));

    return;
  }

  await db
    .update(clientUnitMemberships)
    .set({
      deletedAt: now,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(
      and(
        eq(clientUnitMemberships.respondentId, respondentId),
        isNull(clientUnitMemberships.deletedAt),
      ),
    );

  await db.insert(clientUnitMemberships).values({
    respondentId,
    clientUnitId,
    role: normalizeRole(role),
    isLeader,
    metadata: {},
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
}

function normalizeOptionalText(value: string | undefined | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalEmail(value: string | undefined | null) {
  const normalized = value?.trim().toLowerCase();
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

  if (!clientOrganizationId) {
    throw new Error(
      "Client organization is required when a client unit is selected.",
    );
  }

  if (unit.clientOrganizationId !== clientOrganizationId) {
    throw new Error(
      "Client unit does not belong to selected organization.",
    );
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
      externalCode: normalizeOptionalText(parsed.data.externalCode),
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
      email: normalizeOptionalEmail(parsed.data.email),
      firstName: normalizeOptionalText(parsed.data.firstName),
      lastName: normalizeOptionalText(parsed.data.lastName),
      phone: normalizeOptionalText(parsed.data.phone),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await upsertRespondentIdentityIndex({
    tenantSlug: ctx.tenantSlug,
    respondentId: respondent.id,
    email: identity.email,
  });

  await syncPrimaryUnitMembership({
    db,
    ctx,
    respondentId: respondent.id,
    clientUnitId,
    role: parsed.data.clientUnitRole,
    isLeader: parsed.data.isLeader,
  });
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
      membership: {
        clientUnitRole: normalizeRole(parsed.data.clientUnitRole),
        isLeader: parsed.data.isLeader,
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
      externalCode: normalizeOptionalText(parsed.data.externalCode),
      clientOrganizationId,
      clientUnitId,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(respondents.id, parsed.data.respondentId))
    .returning();

  const normalizedEmail = normalizeOptionalEmail(parsed.data.email);
  const existingIdentity = existing.identity;

  if (existingIdentity) {
    await db
      .update(respondentIdentities)
      .set({
        email: normalizedEmail,
        firstName: normalizeOptionalText(parsed.data.firstName),
        lastName: normalizeOptionalText(parsed.data.lastName),
        phone: normalizeOptionalText(parsed.data.phone),
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(eq(respondentIdentities.id, existingIdentity.id));
  } else {
    await db.insert(respondentIdentities).values({
      respondentId: updatedRespondent.id,
      email: normalizedEmail,
      firstName: normalizeOptionalText(parsed.data.firstName),
      lastName: normalizeOptionalText(parsed.data.lastName),
      phone: normalizeOptionalText(parsed.data.phone),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  await upsertRespondentIdentityIndex({
    tenantSlug: ctx.tenantSlug,
    respondentId: updatedRespondent.id,
    email: normalizedEmail,
  });
  await syncPrimaryUnitMembership({
    db,
    ctx,
    respondentId: updatedRespondent.id,
    clientUnitId,
    role: parsed.data.clientUnitRole,
    isLeader: parsed.data.isLeader,
  });
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
        email: normalizedEmail,
        firstName: normalizeOptionalText(parsed.data.firstName),
        lastName: normalizeOptionalText(parsed.data.lastName),
      },
      membership: {
        clientUnitRole: normalizeRole(parsed.data.clientUnitRole),
        isLeader: parsed.data.isLeader,
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

  await deactivateRespondentIdentityIndex({
    tenantSlug: ctx.tenantSlug,
    respondentId: archivedRespondent.id,
  });

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