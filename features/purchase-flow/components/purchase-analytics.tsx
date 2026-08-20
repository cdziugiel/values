// @humanet-ga4-mp-v1
"use client";

/**
 * Celowo pusty adapter kompatybilności.
 *
 * Event "purchase" jest wysyłany wyłącznie po stronie serwera przez
 * GA4 Measurement Protocol po potwierdzeniu order.status === "paid".
 * Pozostawienie komponentu jako no-op chroni starsze importy przed
 * dublowaniem zakupu po odświeżeniu strony sukcesu.
 */
type PurchaseAnalyticsProps = {
  orderId: string;
  currency: string;
  value: number;
  productCode: string;
  productName: string;
};

export function PurchaseAnalytics(props: PurchaseAnalyticsProps) {
  void props;
  return null;
}
