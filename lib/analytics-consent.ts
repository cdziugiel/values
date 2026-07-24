export type AnalyticsConsentState =
  | "granted"
  | "denied";

type GtagFunction = (
  command: "consent",
  action: "default" | "update",
  parameters: {
    analytics_storage: AnalyticsConsentState;
    ad_storage: AnalyticsConsentState;
    ad_user_data?: AnalyticsConsentState;
    ad_personalization?: AnalyticsConsentState;
    wait_for_update?: number;
  },
) => void;

type ClarityFunction = (
  command: "consentv2",
  parameters: {
    ad_Storage: AnalyticsConsentState;
    analytics_Storage: AnalyticsConsentState;
  },
) => void;

type AnalyticsWindow = Window & {
  gtag?: GtagFunction;
  clarity?: ClarityFunction;
};

const CONSENT_STORAGE_KEY =
  "humanet_analytics_consent";

export function getStoredAnalyticsConsent():
  | AnalyticsConsentState
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const consent = window.localStorage.getItem(
      CONSENT_STORAGE_KEY,
    );

    if (consent === "granted" || consent === "denied") {
      return consent;
    }

    return null;
  } catch {
    return null;
  }
}

export function updateAnalyticsConsent(
  consent: AnalyticsConsentState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const analyticsWindow = window as AnalyticsWindow;

  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      consent,
    );
  } catch {
    // Nie przerywamy aktualizacji zgody, gdy localStorage
    // jest niedostępny lub zablokowany.
  }

  analyticsWindow.gtag?.("consent", "update", {
    analytics_storage: consent,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  analyticsWindow.clarity?.("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: consent,
  });

  window.dispatchEvent(
    new CustomEvent<AnalyticsConsentState>(
      "humanet:analytics-consent-change",
      {
        detail: consent,
      },
    ),
  );
}

export function grantAnalyticsConsent(): void {
  updateAnalyticsConsent("granted");
}

export function denyAnalyticsConsent(): void {
  updateAnalyticsConsent("denied");
}