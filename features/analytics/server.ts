// @humanet-ga4-mp-v1
import "server-only";

export { hasActiveAnalyticsConsent } from "./server/analytics-consent";
export {
  sendGa4ServerEvent,
  validateGa4ServerEvent,
} from "./server/ga4-measurement-protocol";
export { readAnalyticsIdentityFromRequest } from "./server/read-analytics-identity";
export { readAnalyticsIdentityFromMetadata } from "./lib/analytics-identity";
export type { AnalyticsIdentity } from "./types/analytics-identity.types";
