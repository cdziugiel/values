# 04 — Bezpieczeństwo i kontrola dostępu

## Klasa bezpieczeństwa

HUMANET VALUES v2 przetwarza dane firm, pracowników, respondentów i wyniki psychometryczne. Dane te należy traktować jako poufne i potencjalnie wysoce wrażliwe.

Każda funkcja systemu musi być projektowana zgodnie z zasadami:

```txt
least privilege
need to know
defense in depth
secure by default
auditable by default
privacy by design
```

## Obowiązkowa ścieżka requestu

Każda operacja chroniona musi przejść przez:

```txt
1. requireSession()
2. resolveUser()
3. resolveTenantContext()
4. requireTenantAccess()
5. requirePermission()
6. validateInput()
7. executeBusinessOperation()
8. writeAuditLog()
9. returnSafeResponse()
```

## Role bazowe

Minimalny zestaw ról:

```txt
SUPER_ADMIN
TENANT_OWNER
TENANT_ADMIN
TENANT_MEMBER
RESPONDENT
REPORT_VIEWER
```

Możliwe role rozszerzone:

```txt
CONSULTANT
CLIENT_COMPANY_ADMIN
CLIENT_MANAGER
PSYCHOMETRIC_ADMIN
BILLING_ADMIN
```

## Reguły dostępu

### SUPER_ADMIN

- Może zarządzać systemem globalnym.
- Może wejść w dane tenanta tylko w trybie audytowanym.
- Każdy dostęp do danych psychometrycznych przez SUPER_ADMIN musi być logowany.

### TENANT_OWNER

- Zarządza własnym tenantem.
- Może zarządzać użytkownikami tenanta.
- Może widzieć dane klientów i projektów należących do tenanta.

### TENANT_ADMIN

- Zarządza projektami badawczymi, respondentami i raportami w ramach tenanta.
- Nie zarządza ustawieniami systemowymi globalnymi.

### TENANT_MEMBER / CONSULTANT

- Ma dostęp zależny od przypisanych projektów lub klientów.
- Nie powinien domyślnie widzieć wszystkich danych.

### RESPONDENT

- Ma dostęp tylko do własnej sesji badawczej.
- Nie widzi panelu administracyjnego.
- Dostęp najlepiej przez token sesji o ograniczonym czasie ważności.

### REPORT_VIEWER

- Widzi tylko raporty, do których otrzymał jawny dostęp.

## Dane psychometryczne

Wyniki i odpowiedzi respondentów wymagają szczególnej ochrony.

Zalecenia:

- separować dane identyfikujące od odpowiedzi,
- stosować pseudonimizację tam, gdzie możliwe,
- ograniczać dostęp do wyników jednostkowych,
- logować dostęp do raportów i wyników,
- nie pokazywać wyników grupowych dla zbyt małej liczebności grupy,
- jasno kontrolować, kto widzi dane indywidualne, a kto tylko agregaty.

## Minimalna liczebność grupy

Dla raportów grupowych wprowadzić regułę:

```txt
Nie pokazuj agregatu, jeśli N < 5
```

Dla bardziej wrażliwych kontekstów rozważyć:

```txt
N < 7
```

Reguła musi być egzekwowana na backendzie, nie tylko w UI.

## Walidacja wejścia

Każdy input z zewnątrz musi być walidowany na serwerze.

Wymagany wzorzec:

```ts
const parsed = schema.safeParse(input);

if (!parsed.success) {
  throw new ValidationError(parsed.error);
}
```

Frontendowa walidacja jest tylko wsparciem UX, nie zabezpieczeniem.

## Zakaz ujawniania danych w logach

Nie wolno logować:

- odpowiedzi respondentów,
- pełnych wyników psychometrycznych,
- tokenów dostępu,
- connection stringów,
- haseł,
- kodów resetu,
- danych sesji,
- pełnych payloadów formularzy zawierających dane osobowe.

Logi powinny zawierać identyfikatory techniczne i kontekst, nie dane wrażliwe.

## Audit log

Wymagana tabela globalna i tenantowa.

### Global audit log

Dla zdarzeń systemowych:

```txt
login_success
login_failed
password_reset_requested
tenant_created
tenant_disabled
role_changed
super_admin_tenant_access
billing_changed
```

### Tenant audit log

Dla zdarzeń domenowych:

```txt
assessment_project_created
respondent_invited
assessment_completed
report_generated
report_viewed
report_downloaded
answers_exported
questionnaire_used
scoring_model_used
```

Przykładowe pola:

```txt
id
tenant_id
actor_user_id
actor_role
action
entity_type
entity_id
before
after
ip_address
user_agent
created_at
```

## Tokeny respondentów

Token respondenta powinien być:

- losowy,
- trudny do odgadnięcia,
- ograniczony czasowo albo unieważnialny,
- powiązany z jedną sesją,
- niewskazujący jawnie na `tenantId` lub `respondentId`,
- przechowywany w bazie w formie hasha, jeśli możliwe.

## Błędy

Nie zwracać użytkownikowi szczegółów technicznych błędów.

Dobre:

```txt
Nie udało się wykonać operacji. Spróbuj ponownie lub skontaktuj się z administratorem.
```

Złe:

```txt
PostgresError: relation assessment_answers does not exist at tenant_db_url...
```

## Rate limiting

Rate limiting wymagany dla:

- logowania,
- resetu hasła,
- tokenów respondentów,
- zaproszeń email,
- publicznych endpointów,
- eksportów.

## Pliki i raporty

Raporty PDF/HTML i eksporty muszą mieć kontrolę dostępu.

Nie wolno przechowywać poufnych raportów jako publicznych URL-i bez podpisu i czasu ważności.

Zalecane:

```txt
private storage
signed URLs
short expiration
audit on download
```
