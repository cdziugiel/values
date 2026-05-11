import type { MyAssessment } from "../types/my-assessment.types";

export async function getMyDefaultAssessment(): Promise<MyAssessment> {
  return {
    id: "humanet-values-default",
    code: "HUMANET_VALUES_DEFAULT",
    name: "Domyślne badanie HUMANET VALUES",
    description:
      "Wybierz kwestionariusz, który chcesz wypełnić w ramach badania HUMANET VALUES.",
    questionnaires: [
      {
        code: "VALUES",
        name: "HUMANET Values",
        description:
          "Kwestionariusz dotyczący stylów wartości i sposobu funkcjonowania.",
        status: "available",
        estimatedMinutes: 20,
      },
      {
        code: "CHANGE",
        name: "HUMANET Change",
        description:
          "Kwestionariusz dotyczący gotowości, warunków i faz zmiany.",
        status: "available",
        estimatedMinutes: 25,
      },
      {
        code: "SAV",
        name: "Style Adaptacyjno-Wartościowe",
        description:
          "Kwestionariusz stylów adaptacyjno-wartościowych. Zostanie udostępniony po publikacji wersji narzędzia.",
        status: "coming_soon",
        estimatedMinutes: 20,
      },
    ],
  };
}