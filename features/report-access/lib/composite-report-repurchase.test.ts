import { describe, expect, it } from "vitest";

import { hasFreshRequiredCompositeSourceSet } from "./composite-report-repurchase";

describe("hasFreshRequiredCompositeSourceSet", () => {
  const grantCreatedAt = new Date("2026-08-01T10:00:00.000Z");

  function source({
    slot,
    questionnaireId,
    required = true,
    completedAt,
    assessmentSessionId,
    snapshotId,
  }: {
    slot: string;
    questionnaireId: string;
    required?: boolean;
    completedAt: string | null;
    assessmentSessionId: string;
    snapshotId: string;
  }) {
    return {
      slot,
      questionnaireId,
      required,
      candidates: [
        {
          completedAt,
          assessmentSessionId,
          snapshotId,
        },
      ],
    };
  }

  it("blokuje ponowny zakup, gdy nie ma nowych wyników", () => {
    expect(
      hasFreshRequiredCompositeSourceSet({
        grantCreatedAt,
        grantMetadata: null,
        sourceCandidates: [
          source({
            slot: "individual",
            questionnaireId: "q-individual",
            completedAt: "2026-07-31T10:00:00.000Z",
            assessmentSessionId: "session-individual-old",
            snapshotId: "snapshot-individual-old",
          }),
          source({
            slot: "cooperation",
            questionnaireId: "q-cooperation",
            completedAt: "2026-07-30T10:00:00.000Z",
            assessmentSessionId: "session-cooperation-old",
            snapshotId: "snapshot-cooperation-old",
          }),
        ],
      }),
    ).toBe(false);
  });

  it("blokuje ponowny zakup, gdy odświeżono tylko jedno wymagane źródło", () => {
    expect(
      hasFreshRequiredCompositeSourceSet({
        grantCreatedAt,
        grantMetadata: null,
        sourceCandidates: [
          source({
            slot: "individual",
            questionnaireId: "q-individual",
            completedAt: "2026-08-02T10:00:00.000Z",
            assessmentSessionId: "session-individual-new",
            snapshotId: "snapshot-individual-new",
          }),
          source({
            slot: "cooperation",
            questionnaireId: "q-cooperation",
            completedAt: "2026-07-30T10:00:00.000Z",
            assessmentSessionId: "session-cooperation-old",
            snapshotId: "snapshot-cooperation-old",
          }),
        ],
      }),
    ).toBe(false);
  });

  it("pozwala na nowy raport po ponownym ukończeniu wszystkich wymaganych źródeł", () => {
    expect(
      hasFreshRequiredCompositeSourceSet({
        grantCreatedAt,
        grantMetadata: {
          compositeSelection: {
            selectedSources: [
              {
                slot: "individual",
                questionnaireId: "q-individual",
                assessmentSessionId: "session-individual-old",
                assessmentResultSnapshotId: "snapshot-individual-old",
              },
              {
                slot: "cooperation",
                questionnaireId: "q-cooperation",
                assessmentSessionId: "session-cooperation-old",
                assessmentResultSnapshotId: "snapshot-cooperation-old",
              },
            ],
          },
        },
        sourceCandidates: [
          source({
            slot: "individual",
            questionnaireId: "q-individual",
            completedAt: "2026-08-02T10:00:00.000Z",
            assessmentSessionId: "session-individual-new",
            snapshotId: "snapshot-individual-new",
          }),
          source({
            slot: "cooperation",
            questionnaireId: "q-cooperation",
            completedAt: "2026-08-03T10:00:00.000Z",
            assessmentSessionId: "session-cooperation-new",
            snapshotId: "snapshot-cooperation-new",
          }),
          {
            slot: "optional",
            questionnaireId: "q-optional",
            required: false,
            candidates: [],
          },
        ],
      }),
    ).toBe(true);
  });

  it("nie uznaje przeliczonego snapshotu tej samej sesji za nowe badanie", () => {
    expect(
      hasFreshRequiredCompositeSourceSet({
        grantCreatedAt,
        grantMetadata: {
          compositeSelection: {
            selectedSources: [
              {
                slot: "individual",
                questionnaireId: "q-individual",
                assessmentSessionId: "session-individual-old",
                assessmentResultSnapshotId: "snapshot-individual-old",
              },
            ],
          },
        },
        sourceCandidates: [
          source({
            slot: "individual",
            questionnaireId: "q-individual",
            completedAt: "2026-08-02T10:00:00.000Z",
            assessmentSessionId: "session-individual-old",
            snapshotId: "snapshot-individual-recalculated",
          }),
        ],
      }),
    ).toBe(false);
  });

  it("traktuje brak lub błędną datę jako brak świeżego wyniku", () => {
    expect(
      hasFreshRequiredCompositeSourceSet({
        grantCreatedAt,
        grantMetadata: null,
        sourceCandidates: [
          {
            slot: "individual",
            questionnaireId: "q-individual",
            required: true,
            candidates: [
              {
                completedAt: null,
                assessmentSessionId: "session-1",
                snapshotId: "snapshot-1",
              },
              {
                completedAt: "niepoprawna-data",
                assessmentSessionId: "session-2",
                snapshotId: "snapshot-2",
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });
});
