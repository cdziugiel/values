// @humanet-ga4-mp-v1
import { describe, expect, it } from "vitest";

import {
  parseAnalyticsIdentity,
  readAnalyticsIdentityFromMetadata,
} from "./analytics-identity";

describe("analytics identity", () => {
  it("accepts a bounded anonymous GA identity", () => {
    expect(
      parseAnalyticsIdentity({
        clientId: "12345.67890",
        sessionId: "1780000000",
        capturedAt: "2026-08-20T12:00:00.000Z",
      }),
    ).toEqual({
      clientId: "12345.67890",
      sessionId: "1780000000",
      capturedAt: "2026-08-20T12:00:00.000Z",
    });
  });

  it("rejects malformed identity", () => {
    expect(
      parseAnalyticsIdentity({
        clientId: "",
        sessionId: "not-a-number",
        capturedAt: "invalid",
      }),
    ).toBeNull();
  });

  it("reads identity only from the dedicated metadata field", () => {
    expect(
      readAnalyticsIdentityFromMetadata({
        analyticsIdentity: {
          clientId: "1.2",
          sessionId: null,
          capturedAt: "2026-08-20T12:00:00.000Z",
        },
      })?.clientId,
    ).toBe("1.2");
  });
});
