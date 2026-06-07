import crypto from "crypto";

import { normalizeDiscountCode } from "./discount-code-normalize";

const FALLBACK_PEPPER = "humanet-values-discount-code-v1";

export function hashDiscountCode(code: string) {
  const normalized = normalizeDiscountCode(code);

  /**
   * Lepiej dodać DISCOUNT_CODE_PEPPER do env,
   * ale fallback pozwala uruchomić dev bez blokady.
   */
  const pepper = process.env.DISCOUNT_CODE_PEPPER ?? FALLBACK_PEPPER;

  return crypto
    .createHash("sha256")
    .update(`${pepper}:${normalized}`)
    .digest("hex");
}