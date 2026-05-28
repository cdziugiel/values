// features/report-builder/lib/personal-composite-bindings.ts

type PersonalCompositeSourceInput = {
  slot: string;
  label: string;
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;
  required: boolean;
};

function asRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  return {};
}

function normalizeSlot(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizePersonalCompositeSources(
  sources: PersonalCompositeSourceInput[],
) {
  const seenSlots = new Set<string>();

  return sources
    .map((source) => {
      const slot = normalizeSlot(source.slot);
      const questionnaireCode = normalizeCode(source.questionnaireCode);

      return {
        slot,
        label: source.label.trim() || questionnaireCode,
        questionnaireId: source.questionnaireId,
        questionnaireCode,
        questionnaireName: source.questionnaireName.trim() || questionnaireCode,
        required: Boolean(source.required),
      };
    })
    .filter((source) => {
      if (!source.slot || !source.questionnaireId || !source.questionnaireCode) {
        return false;
      }

      if (seenSlots.has(source.slot)) {
        return false;
      }

      seenSlots.add(source.slot);
      return true;
    });
}

export function buildPersonalCompositeDataBindings({
  currentDataBindings,
  sources,
}: {
  currentDataBindings: unknown;
  sources: PersonalCompositeSourceInput[];
}) {
  const current = asRecord(currentDataBindings);
  const normalizedSources = normalizePersonalCompositeSources(sources);

  const primary =
    normalizedSources.find((source) => source.required)?.slot ??
    normalizedSources[0]?.slot ??
    null;

  return {
    ...current,
    version: 1,
    payloadKind: "personal_composite",
    requiredContext: {
      ...(asRecord(current.requiredContext) ?? {}),
      respondentId: true,
    },
    sources: {
      ...asRecord(current.sources),
      personalReports: normalizedSources,
    },
    slots: {
      ...asRecord(current.slots),
      primary,
      secondary: normalizedSources
        .map((source) => source.slot)
        .filter((slot) => slot !== primary),
    },
  };
}

export function readPersonalCompositeSources(dataBindings: unknown) {
  const bindings = asRecord(dataBindings);
  const sources = asRecord(bindings.sources);
  const personalReports = sources.personalReports;

  if (!Array.isArray(personalReports)) {
    return [];
  }

  return personalReports
    .map((source) => asRecord(source))
    .map((source) => ({
      slot: typeof source.slot === "string" ? source.slot : "",
      label: typeof source.label === "string" ? source.label : "",
      questionnaireId:
        typeof source.questionnaireId === "string"
          ? source.questionnaireId
          : "",
      questionnaireCode:
        typeof source.questionnaireCode === "string"
          ? source.questionnaireCode
          : "",
      questionnaireName:
        typeof source.questionnaireName === "string"
          ? source.questionnaireName
          : "",
      required: Boolean(source.required),
    }))
    .filter((source) => source.slot && source.questionnaireCode);
}