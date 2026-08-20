// @humanet-ga4-mp-v1
import { describe, expect, it } from "vitest";

import { findForbiddenAnalyticsParam } from "./ga4-privacy";

describe("GA4 privacy guard", () => {
  it("allows approved ecommerce and funnel fields", () => {
    expect(
      findForbiddenAnalyticsParam({
        offer_code: "report",
        report_type: "work",
        items: [
          {
            item_id: "report",
            item_name: "Raport HUMANET",
            item_category: "report",
          },
        ],
      }),
    ).toBeNull();
  });

  it("blocks direct PII fields", () => {
    expect(
      findForbiddenAnalyticsParam({
        lead_source: "contact",
        email: "test@example.invalid",
      }),
    ).toBe("email");
  });

  it("blocks psychometric payloads even when nested", () => {
    expect(
      findForbiddenAnalyticsParam({
        context: {
          dimension_scores: { X: 1.2 },
        },
      }),
    ).toBe("context.dimension_scores");
  });
});
