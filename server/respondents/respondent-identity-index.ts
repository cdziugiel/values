// server/respondents/respondent-identity-index.ts

import {
  and,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import {
  respondentIdentityIndex,
  users,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";

const USER_LOOKUP_BATCH_SIZE = 1_000;
const INDEX_UPSERT_BATCH_SIZE = 500;

type RespondentIdentityIndexInput = {
  tenantSlug: string;
  respondentId: string;
  email: string | null | undefined;

  /**
   * undefined:
   * spróbuj automatycznie znaleźć użytkownika po e-mailu.
   *
   * string:
   * przypisz wskazanego użytkownika.
   *
   * null:
   * jawnie pozostaw wpis bez userId.
   */
  userId?: string | null;
};

export type BulkRespondentIdentityIndexResult = {
  received: number;
  normalized: number;
  skipped: number;
  upserted: number;
};

function normalizeEmail(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim().toLowerCase();

  return normalized || null;
}

function normalizeTenantSlug(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized || null;
}

function chunkArray<T>(rows: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("Rozmiar partii musi być większy od zera.");
  }

  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function buildRespondentIdentityKey({
  tenantSlug,
  respondentId,
}: {
  tenantSlug: string;
  respondentId: string;
}) {
  return `${tenantSlug}:${respondentId}`;
}

/**
 * Pobiera mapę:
 *
 * normalizedEmail -> userId
 *
 * Zapytania wykonywane są partiami, aby nie przekroczyć limitu
 * parametrów PostgreSQL przy dużych importach.
 */
async function resolveUserIdsByNormalizedEmail(
  emails: string[],
): Promise<Map<string, string>> {
  const uniqueEmails = Array.from(
    new Set(
      emails
        .map(normalizeEmail)
        .filter((email): email is string => Boolean(email)),
    ),
  );

  const userIdByEmail = new Map<string, string>();

  for (const emailBatch of chunkArray(
    uniqueEmails,
    USER_LOOKUP_BATCH_SIZE,
  )) {
    const rows = await controlDb
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          inArray(users.email, emailBatch),
          isNull(users.deletedAt),
        ),
      );

    for (const row of rows) {
      const normalizedEmail = normalizeEmail(row.email);

      if (!normalizedEmail) {
        continue;
      }

      userIdByEmail.set(normalizedEmail, row.id);
    }
  }

  return userIdByEmail;
}

/**
 * Tworzy lub aktualizuje pojedynczy wpis indeksu.
 *
 * Funkcja jest idempotentna dla pary:
 *
 * tenantSlug + respondentId
 */
export async function upsertRespondentIdentityIndex({
  tenantSlug,
  respondentId,
  email,
  userId,
}: RespondentIdentityIndexInput) {
  const normalizedTenantSlug = normalizeTenantSlug(tenantSlug);
  const normalizedEmail = normalizeEmail(email);
  const normalizedRespondentId = respondentId.trim();

  if (!normalizedTenantSlug || !normalizedRespondentId) {
    throw new Error(
      "Nie można zsynchronizować indeksu respondenta bez tenantSlug i respondentId.",
    );
  }

  let resolvedUserId: string | null;

  if (userId !== undefined) {
    /*
     * Jawnie przekazany string albo null ma pierwszeństwo.
     */
    resolvedUserId = userId;
  } else if (normalizedEmail) {
    const matchedUser = await controlDb.query.users.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(users.email, normalizedEmail),
        isNull(users.deletedAt),
      ),
    });

    resolvedUserId = matchedUser?.id ?? null;
  } else {
    resolvedUserId = null;
  }

  const now = new Date();

  const [row] = await controlDb
    .insert(respondentIdentityIndex)
    .values({
      tenantSlug: normalizedTenantSlug,
      respondentId: normalizedRespondentId,
      normalizedEmail,
      userId: resolvedUserId,
      status: "active",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: [
        respondentIdentityIndex.tenantSlug,
        respondentIdentityIndex.respondentId,
      ],
      set: {
        normalizedEmail,
        userId: resolvedUserId,
        status: "active",
        lastSyncedAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    })
    .returning();

  if (!row) {
    throw new Error(
      "Nie udało się zapisać indeksu tożsamości respondenta.",
    );
  }

  return row;
}

/**
 * Zbiorcza synchronizacja indeksu.
 *
 * Przeznaczona między innymi do:
 * - importów CSV/XLSX,
 * - backfillu istniejących tenantów,
 * - okresowej rekonsyliacji danych.
 *
 * Funkcja:
 * - normalizuje dane,
 * - pomija niepełne rekordy,
 * - deduplikuje respondentów,
 * - pobiera użytkowników partiami,
 * - zapisuje indeks partiami.
 */
export async function bulkUpsertRespondentIdentityIndex(
  inputRows: RespondentIdentityIndexInput[],
): Promise<BulkRespondentIdentityIndexResult> {
  if (inputRows.length === 0) {
    return {
      received: 0,
      normalized: 0,
      skipped: 0,
      upserted: 0,
    };
  }

  const normalizedRows = inputRows
    .map((row) => {
      const tenantSlug = normalizeTenantSlug(row.tenantSlug);
      const respondentId = row.respondentId?.trim();
      const normalizedEmail = normalizeEmail(row.email);

      if (!tenantSlug || !respondentId) {
        return null;
      }

      return {
        tenantSlug,
        respondentId,
        normalizedEmail,
        explicitUserId: row.userId,
      };
    })
    .filter(
      (
        row,
      ): row is {
        tenantSlug: string;
        respondentId: string;
        normalizedEmail: string | null;
        explicitUserId: string | null | undefined;
      } => row !== null,
    );

  /**
   * Ostatni rekord dla tej samej pary tenant/respondent wygrywa.
   * Jest to przydatne, gdy jeden import zawiera kilka wierszy
   * dotyczących tego samego respondenta.
   */
  const deduplicatedByRespondent = new Map<
    string,
    (typeof normalizedRows)[number]
  >();

  for (const row of normalizedRows) {
    deduplicatedByRespondent.set(
      buildRespondentIdentityKey(row),
      row,
    );
  }

  const deduplicatedRows = Array.from(
    deduplicatedByRespondent.values(),
  );

  /**
   * Użytkownika po e-mailu wyszukujemy tylko wtedy, gdy userId
   * nie został jawnie przekazany.
   */
  const emailsToResolve = deduplicatedRows
    .filter((row) => row.explicitUserId === undefined)
    .map((row) => row.normalizedEmail)
    .filter((email): email is string => Boolean(email));

  const userIdByEmail =
    await resolveUserIdsByNormalizedEmail(emailsToResolve);

  const now = new Date();
  let upserted = 0;

  for (const batch of chunkArray(
    deduplicatedRows,
    INDEX_UPSERT_BATCH_SIZE,
  )) {
    const values = batch.map((row) => {
      let resolvedUserId: string | null;

      if (row.explicitUserId !== undefined) {
        resolvedUserId = row.explicitUserId;
      } else if (row.normalizedEmail) {
        resolvedUserId =
          userIdByEmail.get(row.normalizedEmail) ?? null;
      } else {
        resolvedUserId = null;
      }

      return {
        tenantSlug: row.tenantSlug,
        respondentId: row.respondentId,
        normalizedEmail: row.normalizedEmail,
        userId: resolvedUserId,
        status: "active" as const,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
    });

    await controlDb
      .insert(respondentIdentityIndex)
      .values(values)
      .onConflictDoUpdate({
        target: [
          respondentIdentityIndex.tenantSlug,
          respondentIdentityIndex.respondentId,
        ],
        set: {
          /*
           * Przy zbiorczym UPSERT każda linia może mieć inne dane.
           * Dlatego korzystamy z wartości EXCLUDED, a nie ze stałych
           * wartości wyliczonych dla całej partii.
           */
          normalizedEmail: sql`excluded.normalized_email`,
          userId: sql`excluded.user_id`,
          status: sql`excluded.status`,
          lastSyncedAt: sql`excluded.last_synced_at`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
      });

    upserted += values.length;
  }

  return {
    received: inputRows.length,
    normalized: normalizedRows.length,
    skipped: inputRows.length - normalizedRows.length,
    upserted,
  };
}

/**
 * Wywoływane po archiwizacji albo usunięciu respondenta.
 */
export async function deactivateRespondentIdentityIndex({
  tenantSlug,
  respondentId,
}: {
  tenantSlug: string;
  respondentId: string;
}) {
  const normalizedTenantSlug = normalizeTenantSlug(tenantSlug);
  const normalizedRespondentId = respondentId.trim();

  if (!normalizedTenantSlug || !normalizedRespondentId) {
    throw new Error(
      "Nie można dezaktywować indeksu respondenta bez tenantSlug i respondentId.",
    );
  }

  const now = new Date();

  const rows = await controlDb
    .update(respondentIdentityIndex)
    .set({
      status: "inactive",
      deletedAt: now,
      updatedAt: now,
      lastSyncedAt: now,
    })
    .where(
      and(
        eq(
          respondentIdentityIndex.tenantSlug,
          normalizedTenantSlug,
        ),
        eq(
          respondentIdentityIndex.respondentId,
          normalizedRespondentId,
        ),
        isNull(respondentIdentityIndex.deletedAt),
      ),
    )
    .returning({
      id: respondentIdentityIndex.id,
    });

  return {
    deactivated: rows.length > 0,
    count: rows.length,
  };
}

/**
 * Gdy konto użytkownika powstało później niż rekord respondenta,
 * przypisujemy do niego wszystkie aktywne indeksy o tym samym e-mailu.
 *
 * Nie przejmujemy indeksów, które są już jawnie przypisane
 * do innego użytkownika.
 */
export async function linkRespondentIndexesToUser({
  userId,
  email,
}: {
  userId: string;
  email: string | null | undefined;
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUserId = userId.trim();

  if (!normalizedEmail || !normalizedUserId) {
    return {
      linked: 0,
    };
  }

  const now = new Date();

  const rows = await controlDb
    .update(respondentIdentityIndex)
    .set({
      userId: normalizedUserId,
      updatedAt: now,
      lastSyncedAt: now,
    })
    .where(
      and(
        eq(
          respondentIdentityIndex.normalizedEmail,
          normalizedEmail,
        ),
        eq(respondentIdentityIndex.status, "active"),
        isNull(respondentIdentityIndex.deletedAt),
        or(
          isNull(respondentIdentityIndex.userId),
          eq(
            respondentIdentityIndex.userId,
            normalizedUserId,
          ),
        ),
      ),
    )
    .returning({
      id: respondentIdentityIndex.id,
    });

  return {
    linked: rows.length,
  };
}