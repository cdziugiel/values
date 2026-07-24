import Script from "next/script";
import {
  GoogleAnalytics,
  GoogleTagManager,
} from "@next/third-parties/google";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

const hasGoogleAnalytics = Boolean(gtmId || gaMeasurementId);
const hasAnyAnalytics = Boolean(
  gtmId || gaMeasurementId || clarityProjectId,
);

export function Analytics() {
  if (process.env.NODE_ENV !== "production" || !hasAnyAnalytics) {
    return null;
  }

  return (
    <>
      {/*
       * Musi wykonać się przed GTM/GA4.
       *
       * Domyślnie analityka jest wyłączona. Jeżeli użytkownik podjął
       * wcześniej decyzję, jej stan jest odczytywany z localStorage.
       */}
      {hasGoogleAnalytics && (
        <Script
          id="analytics-default-consent"
          strategy="beforeInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];

            window.gtag = window.gtag || function () {
              window.dataLayer.push(arguments);
            };

            try {
              var savedAnalyticsConsent =
                window.localStorage.getItem(
                  "humanet_analytics_consent"
                );

              var analyticsConsent =
                savedAnalyticsConsent === "granted"
                  ? "granted"
                  : "denied";

              window.gtag("consent", "default", {
                analytics_storage: analyticsConsent,
                ad_storage: "denied",
                ad_user_data: "denied",
                ad_personalization: "denied",
                wait_for_update: 500
              });
            } catch (error) {
              window.gtag("consent", "default", {
                analytics_storage: "denied",
                ad_storage: "denied",
                ad_user_data: "denied",
                ad_personalization: "denied",
                wait_for_update: 500
              });
            }
          `}
        </Script>
      )}

      {/*
       * Preferujemy GTM. Bezpośrednie GA4 jest uruchamiane tylko wtedy,
       * gdy identyfikator GTM nie został podany.
       */}
      {gtmId ? (
        <GoogleTagManager gtmId={gtmId} />
      ) : (
        gaMeasurementId && (
          <GoogleAnalytics gaId={gaMeasurementId} />
        )
      )}

      {clarityProjectId && (
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
        >
          {`
            (function(c, l, a, r, i, t, y) {
              c[a] = c[a] || function() {
                (c[a].q = c[a].q || []).push(arguments);
              };

              t = l.createElement(r);
              t.async = 1;
              t.src = "https://www.clarity.ms/tag/" + i;

              y = l.getElementsByTagName(r)[0];
              y.parentNode.insertBefore(t, y);

              try {
                var savedAnalyticsConsent =
                  c.localStorage.getItem(
                    "humanet_analytics_consent"
                  );

                c[a]("consentv2", {
                  ad_Storage: "denied",
                  analytics_Storage:
                    savedAnalyticsConsent === "granted"
                      ? "granted"
                      : "denied"
                });
              } catch (error) {
                c[a]("consentv2", {
                  ad_Storage: "denied",
                  analytics_Storage: "denied"
                });
              }
            })(
              window,
              document,
              "clarity",
              "script",
              "${clarityProjectId}"
            );
          `}
        </Script>
      )}
    </>
  );
}