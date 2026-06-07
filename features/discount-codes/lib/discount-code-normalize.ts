export function normalizeDiscountCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function createDiscountCodePreview(code: string) {
  return normalizeDiscountCode(code);
}