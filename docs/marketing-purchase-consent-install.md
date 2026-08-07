# Wdrożenie ścieżki zakupu i zgód — values

Plik utworzony przez `install-humanet-values-marketing.mjs`.

## Co zostało ponownie użyte

- publiczne tworzenie/wznawianie sesji badania;
- istniejący checkout raportów;
- `report_access_products` jako jedyne źródło ceny, VAT i waluty;
- istniejące report template'y i bindingi kwestionariusz → raport;
- kody rabatowe, w tym 100%;
- Przelewy24 register/verify/webhook;
- granty raportów i ich idempotencja;
- metryczka normatywna, wersjonowana zgoda badawcza i podstawowa informacja zwrotna.

## Nowe zmienne

```env
# Shared consent/analytics
NEXT_PUBLIC_CONSENT_VERSION=2026-08-01
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=

# Report type -> existing active public questionnaire code
HUMANET_REPORT_TYPE_RELATIONS_QUESTIONNAIRE_CODE=HUMANET_VALUES_IND
HUMANET_REPORT_TYPE_WORK_QUESTIONNAIRE_CODE=HUMANET_VALUES_COOP
HUMANET_REPORT_TYPE_CHANGE_QUESTIONNAIRE_CODE=HUMANET_CHANGE

# Legal versions
LEGAL_TERMS_VERSION=2026-08-01
LEGAL_PRIVACY_VERSION=2026-08-01
MARKETING_EMAIL_CONSENT_VERSION=2026-08-01

# Cal.com
NEXT_PUBLIC_CALCOM_REPORT_60_URL=
NEXT_PUBLIC_CALCOM_DECISION_90_URL=
NEXT_PUBLIC_CALCOM_GENERAL_CONSULTATION_URL=
CALCOM_WEBHOOK_SECRET=
```

Nie ma już `HUMANET_OFFER_*_PRODUCT_CODE`. Produkt jest rozwiązywany z bazy po
**konkretnym template raportu + offerCode**.

## Konfiguracja cen i pakietów B2C

Wejdź do `/dashboard/report-access`. Instalator rozszerza istniejący formularz
produktu o sekcję **Pakiet B2C**, nie tworząc nowego cennika.

Dla każdego template raportu możesz utworzyć osobne produkty:

| Template raportu | Pakiet B2C | Przykładowy kod produktu |
| --- | --- | --- |
| Relacje | Sam raport | `RELATIONS_REPORT` |
| Relacje | Raport + konsultacja | `RELATIONS_REPORT_PLUS_CONSULTATION` |
| Relacje | Wsparcie decyzji | `RELATIONS_DECISION_SUPPORT` |
| Współpraca | Sam raport | `WORK_REPORT` |
| Współpraca | Raport + konsultacja | `WORK_REPORT_PLUS_CONSULTATION` |
| Współpraca | Wsparcie decyzji | `WORK_DECISION_SUPPORT` |
| Zmiana | Sam raport | `CHANGE_REPORT` |
| Zmiana | Raport + konsultacja | `CHANGE_REPORT_PLUS_CONSULTATION` |
| Zmiana | Wsparcie decyzji | `CHANGE_DECISION_SUPPORT` |

Nie musisz mieć wszystkich dziewięciu. Nieobecna kombinacja jest po prostu
niedostępna na `/start`.

Cena netto, VAT, cena brutto i waluta pozostają w istniejących polach produktu.
Konfiguracja B2C jest dopisywana do istniejącego `report_access_products.config`,
np.:

```json
{
  "b2cOffer": {
    "offerCode": "report_plus_consultation",
    "consultation": {
      "kind": "report_consultation",
      "durationMinutes": 60
    }
  }
}
```

Inne klucze `config` są zachowywane. Produkt bez `b2cOffer` działa jak dotychczas
w istniejących/legacy ścieżkach. System blokuje konfigurację dwóch aktywnych
produktów z tym samym `reportTemplateId + offerCode`, aby wybór ceny był
jednoznaczny.

## Jak system wybiera cenę

1. `reportType` wybiera publiczny kwestionariusz.
2. Istniejący binding wybiera właściwy template raportu.
3. `offerCode` wybiera aktywny produkt B2C przypisany do tego template'u.
4. `purchase_intent.productCode` zapisuje serwerowy snapshot wybranego produktu.
5. Checkout jeszcze raz sprawdza, czy produkt nadal należy do tego template'u i
   nadal ma ten sam `offerCode`.
6. Cena, VAT i waluta są zawsze pobierane z produktu w bazie — nigdy z URL.
7. Przy tworzeniu zamówienia zakres konsultacji jest snapshotowany w metadata,
   więc późniejsza edycja produktu nie zmienia już opłaconego świadczenia.


## UX dokumentów prawnych

- Polityka prywatności nie jest przedstawiana jako obowiązkowa „zgoda”.
- Po zalogowaniu nie ma osobnego ekranu blokującego dostęp do aplikacji.
- Link do polityki znajduje się w ustawieniach prywatności i przy zakupie.
- Regulamin jest akceptowany dopiero w ścieżce zakupowej B2C, bezpośrednio przed utworzeniem zamówienia.
- Akceptacja regulaminu jest wersjonowana w istniejących `legal_documents` / `legal_acceptances`.

## Migracje

Instalator generuje pliki schemy i — jeśli dostępne jest `node_modules` —
uruchamia `npm run db:generate -- --name humanet_marketing_purchase_consent`.

Konfiguracja pakietów B2C korzysta z istniejącego JSONB `report_access_products.config`,
więc nie wymaga dodatkowej kolumny ani osobnego cennika.

Nie uruchamiaj migracji bez przeglądu. Przed produkcją:

1. przejrzyj wygenerowaną migrację;
2. wykonaj backup;
3. uruchom migrację kontrolowaną procedurą;
4. sprawdź indeksy i istniejące rekordy.

## Testy odbiorcze P0

1. Wejście `/start?offer=report` i wybór rodzaju raportu.
2. Każda skonfigurowana kombinacja raport × pakiet pokazuje właściwą cenę.
3. Nieskonfigurowana kombinacja nie uruchamia badania i pokazuje komunikat.
4. Magic link wraca do tego samego `/start`.
5. Sesja jest wznowiona zamiast duplikowana.
6. Zakończenie badania nadal pokazuje dobrowolny program badawczy i możliwość pominięcia.
7. Link zakupu prowadzi przez purchase intent do istniejącego checkoutu.
8. Checkout odrzuca produkt, jeśli jego `b2cOffer.offerCode` został zmieniony.
9. Rabat 100% nie wywołuje P24, ale tworzy grant i ewentualne uprawnienie konsultacyjne.
10. P24 webhook tworzy grant tylko raz i finalizuje purchase intent.
11. Istniejące zakupy bez purchase intent działają jak wcześniej.
12. Produkty bez `b2cOffer` nie są używane przez `/start`, ale pozostają dostępne dla legacy flow.
13. GTM/GA/Clarity nie pojawiają się w Network przed zgodą.
14. Cookie `humanet_consent_v1` działa na obu subdomenach.
15. Login nie wymaga checkboxa „zgody na politykę”.
16. Nie ma globalnego ekranu blokującego po logowaniu; polityka prywatności jest informacją, nie obowiązkową zgodą.
17. Przy zakupie B2C użytkownik akceptuje aktualną wersję regulaminu, a system zapisuje wersjonowaną akceptację.
18. `/my/privacy` pozwala zarządzać zgodami dobrowolnymi i otworzyć politykę prywatności.
19. Dane psychometryczne nie trafiają do `dataLayer`.

## Uwaga prawna

Mechanizm wersjonowania, audytu i wycofywania zgód nie zastępuje przeglądu
treści dokumentów, podstaw prawnych i retencji przez osobę odpowiedzialną za
RODO/prawo.


## Trwałe „Moje konsultacje”

Użytkownik ma stałą pozycję `/my/consultations`. Może tam wrócić do
konsultacji zawartej w pakiecie, nawet jeśli zamknął ekran sukcesu po płatności.
Po synchronizacji zobaczy termin, link do spotkania, możliwość zmiany terminu
oraz link do raportu powiązanego z konsultacją.

Przycisk „Umów dodatkową konsultację” działa niezależnie od pakietu.
Używa `NEXT_PUBLIC_CALCOM_GENERAL_CONSULTATION_URL`, a jeśli zmienna jest pusta,
fallbackiem jest `NEXT_PUBLIC_CALCOM_REPORT_60_URL`.

## Webhook Cal.com

Ustaw webhook:

```text
https://values.humanet.me/api/webhooks/calcom
```

i ten sam sekret:

```env
CALCOM_WEBHOOK_SECRET=<długi-losowy-sekret>
```

Zalecane triggery: `BOOKING_CREATED`, `BOOKING_CONFIRMED`,
`BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `BOOKING_COMPLETED` oraz opcjonalnie
`BOOKING_NO_SHOW_UPDATED`.

Endpoint weryfikuje `x-cal-signature-256` jako HMAC SHA-256 z surowego body.
Synchronizuje referencję, datę i czas, link do spotkania, reschedule/cancel.
Anulowanie konsultacji zawartej w pakiecie przywraca status „Do umówienia”.

## Panel admina

`/dashboard/consultations` pokazuje termin, czas, referencję Cal.com, link do
Google Meet / wideospotkania oraz – jeśli konsultacja jest powiązana z zakupem
raportu – bezpośredni link do pełnego raportu użytkownika.

## Poprawki techniczne

- nowe testy Vitest nie zależą od aliasu `@/shared/marketing`;
- `/start` nie importuje usuniętego globalnego gate'u prawnego;
- instalator usuwa zduplikowaną deklarację `b2cOffer` w checkoutcie;
- dla Next.js 16 skrypt `lint` jest zmieniany z `next lint` na `eslint .`,
  jeżeli repo nadal ma starą wartość.
