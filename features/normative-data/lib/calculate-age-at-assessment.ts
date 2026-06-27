export function calculateAgeAtAssessment(
  dateOfBirth: string,
  assessmentDate: Date,
): number {
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);

  if (Number.isNaN(birthDate.getTime())) {
    throw new Error("Nieprawidłowa data urodzenia.");
  }

  let age = assessmentDate.getUTCFullYear() - birthDate.getUTCFullYear();

  const assessmentMonth = assessmentDate.getUTCMonth();
  const birthMonth = birthDate.getUTCMonth();

  if (
    assessmentMonth < birthMonth ||
    (assessmentMonth === birthMonth &&
      assessmentDate.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}
