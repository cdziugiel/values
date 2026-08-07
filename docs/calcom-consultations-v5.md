# HUMANET VALUES — konsultacje / Cal.com v5

## Co zmienia v5

- rezerwacja z HUMANET korzysta z oficjalnego embed Cal.com zamiast zwykłego linku,
- `metadata[consultationEntitlementId]`, `metadata[orderId]` i `metadata[source]` są przekazywane przez konfigurację embed i wracają w webhooku,
- `bookingSuccessfulV2` zapisuje UID, termin i link do spotkania bezpośrednio po rezerwacji,
- webhook pozostaje redundancją dla utworzenia, przełożenia i anulowania,
- dodatkowa konsultacja tworzy rekord HUMANET przed otwarciem kalendarza,
- opcjonalny Cal.com API sync odzyskuje starsze rezerwacje, które powstały przed tą poprawką.

## ENV

Istniejące:

```env
NEXT_PUBLIC_CALCOM_REPORT_60_URL=https://cal.com/.../...
NEXT_PUBLIC_CALCOM_DECISION_90_URL=https://cal.com/.../...
NEXT_PUBLIC_CALCOM_GENERAL_CONSULTATION_URL=https://cal.com/.../...
CALCOM_WEBHOOK_SECRET=...
```

Nowe / zalecane:

```env
CALCOM_API_KEY=cal_...
HUMANET_GENERAL_CONSULTATION_MINUTES=60
```

`CALCOM_API_KEY` nie jest konieczny dla nowych rezerwacji zrobionych przez embed HUMANET, ale jest potrzebny do automatycznego odzyskania wcześniejszych rezerwacji i do przycisku „Synchronizuj z Cal.com” w panelu admina.

## Cal.com webhook

Subscriber URL:

```text
https://values.humanet.me/api/webhooks/calcom
```

Włącz minimum:

- BOOKING_CREATED
- BOOKING_RESCHEDULED
- BOOKING_CANCELLED

Secret w Cal.com musi być identyczny jak `CALCOM_WEBHOOK_SECRET`.

## Po instalacji

Nie ma zmian schematu bazy w v5. Uruchom:

```bash
npm test
npm run lint
npm run build
```

Następnie ustaw `CALCOM_API_KEY`, zrestartuj aplikację i w `/dashboard/consultations` użyj „Synchronizuj z Cal.com”, aby odzyskać starszą rezerwację.
