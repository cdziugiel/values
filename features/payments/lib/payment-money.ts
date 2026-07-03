export function moneyToCents(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Nieprawidłowa wartość pieniężna.");
  }

  return Math.round(parsed * 100);
}