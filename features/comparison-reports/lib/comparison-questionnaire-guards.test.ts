import { describe, expect, it } from "vitest";

import { assertComparisonQuestionnaireMatchesProduct } from "./comparison-questionnaire-guards";

describe("assertComparisonQuestionnaireMatchesProduct", () => {
  it("akceptuje wynik zgodny z kwestionariuszem produktu", () => {
    expect(() =>
      assertComparisonQuestionnaireMatchesProduct({
        actualQuestionnaireId: "questionnaire-a",
        expectedQuestionnaireId: "questionnaire-a",
        subjectLabel: "Wybrany wynik",
      }),
    ).not.toThrow();
  });

  it("odrzuca wynik innego kwestionariusza", () => {
    expect(() =>
      assertComparisonQuestionnaireMatchesProduct({
        actualQuestionnaireId: "questionnaire-b",
        expectedQuestionnaireId: "questionnaire-a",
        subjectLabel: "Kod drugiej osoby",
      }),
    ).toThrow(
      "Kod drugiej osoby dotyczy innego kwestionariusza niż wybrany produkt raportowy.",
    );
  });

  it("odrzuca wynik bez identyfikatora kwestionariusza", () => {
    expect(() =>
      assertComparisonQuestionnaireMatchesProduct({
        actualQuestionnaireId: null,
        expectedQuestionnaireId: "questionnaire-a",
        subjectLabel: "Wybrany wynik",
      }),
    ).toThrow(
      "Wybrany wynik nie zawiera informacji o rodzaju kwestionariusza.",
    );
  });
});
