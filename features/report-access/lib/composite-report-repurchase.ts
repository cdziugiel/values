type CompositeSourceCandidate = {
  slot: string;
  questionnaireId: string;
  required: boolean;
  candidates: Array<{
    assessmentSessionId: string;
    snapshotId: string;
    completedAt: Date | string | null;
  }>;
};

type FrozenCompositeSource = {
  slot?: unknown;
  questionnaireId?: unknown;
  assessmentSessionId?: unknown;
  sessionId?: unknown;
  assessmentResultSnapshotId?: unknown;
  snapshotId?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function toTimestamp(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const timestamp = value instanceof Date
    ? value.getTime()
    : new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function readFrozenSources(metadata: unknown): FrozenCompositeSource[] {
  const record = asRecord(metadata);
  const selection = asRecord(record.compositeSelection);
  const selectedSources = selection.selectedSources;

  return Array.isArray(selectedSources)
    ? selectedSources.filter(
        (source): source is FrozenCompositeSource =>
          Boolean(source) && typeof source === "object" && !Array.isArray(source),
      )
    : [];
}

function findFrozenSource({
  source,
  frozenSources,
}: {
  source: CompositeSourceCandidate;
  frozenSources: FrozenCompositeSource[];
}) {
  return frozenSources.find((frozenSource) => {
    const frozenSlot = normalizeString(frozenSource.slot);
    const frozenQuestionnaireId = normalizeString(
      frozenSource.questionnaireId,
    );

    return frozenSlot === source.slot ||
      frozenQuestionnaireId === source.questionnaireId;
  }) ?? null;
}

/**
 * Nowa instancja raportu composite może zostać kupiona dopiero wtedy,
 * gdy każdy wymagany kwestionariusz ma nową ukończoną sesję po poprzednim
 * grancie. Dla grantów z `compositeSelection` dodatkowo wymagamy innej sesji
 * i innego snapshotu niż te użyte w poprzednim raporcie.
 *
 * Fallback oparty o datę grantu zachowuje poprawne działanie grantów legacy,
 * które nie mają jeszcze zamrożonego wyboru źródeł w metadata.
 */
export function hasFreshRequiredCompositeSourceSet({
  grantCreatedAt,
  grantMetadata,
  sourceCandidates,
}: {
  grantCreatedAt: Date;
  grantMetadata: unknown;
  sourceCandidates: CompositeSourceCandidate[];
}) {
  const grantTimestamp = grantCreatedAt.getTime();

  if (!Number.isFinite(grantTimestamp)) {
    return false;
  }

  const requiredSources = sourceCandidates.filter(
    (source) => source.required,
  );

  if (requiredSources.length === 0) {
    return false;
  }

  const frozenSources = readFrozenSources(grantMetadata);

  return requiredSources.every((source) => {
    const frozenSource = findFrozenSource({
      source,
      frozenSources,
    });

    const frozenSessionId = frozenSource
      ? normalizeString(
          frozenSource.assessmentSessionId ?? frozenSource.sessionId,
        )
      : null;

    const frozenSnapshotId = frozenSource
      ? normalizeString(
          frozenSource.assessmentResultSnapshotId ?? frozenSource.snapshotId,
        )
      : null;

    return source.candidates.some((candidate) => {
      const completedTimestamp = toTimestamp(candidate.completedAt);

      if (completedTimestamp === null || completedTimestamp <= grantTimestamp) {
        return false;
      }

      if (
        frozenSessionId &&
        candidate.assessmentSessionId === frozenSessionId
      ) {
        return false;
      }

      if (frozenSnapshotId && candidate.snapshotId === frozenSnapshotId) {
        return false;
      }

      return true;
    });
  });
}
