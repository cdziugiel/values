# 13 — Routing po logowaniu i domyślne badanie użytkownika

## Cel

Ten dokument opisuje docelową logikę przekierowania użytkownika po zalogowaniu do systemu HUMANET VALUES v2.

System nie powinien zakładać, że każdy zalogowany użytkownik jest administratorem, tenantem, konsultantem lub użytkownikiem panelu administracyjnego. Część użytkowników będzie korzystać z systemu jako osoby wypełniające domyślne badanie HUMANET VALUES.

## Zasada główna

Po zalogowaniu system musi najpierw ustalić rolę użytkownika oraz jego kontekst dostępu.

Dopiero na tej podstawie użytkownik zostaje przekierowany do odpowiedniego obszaru aplikacji.

```txt
login
→ resolve user
→ resolve global role
→ resolve tenant memberships
→ resolve available report access
→ redirect to proper landing
```

## Logika przekierowania po logowaniu

Docelowa kolejność decyzyjna:

```txt
1. Jeżeli użytkownik jest SUPER_ADMIN
   → przekieruj do panelu globalnego.

2. Jeżeli użytkownik ma aktywne członkostwo w przynajmniej jednym tenancie
   jako TENANT_OWNER, TENANT_ADMIN, TENANT_MEMBER lub CONSULTANT
   → przekieruj do panelu wybranego / domyślnego tenanta.

3. Jeżeli użytkownik ma wyłącznie dostęp do raportów
   jako REPORT_VIEWER
   → przekieruj do obszaru raportów użytkownika.

4. Jeżeli użytkownik nie jest tenantem, adminem, konsultantem ani report viewerem
   → przekieruj do domyślnego badania HUMANET VALUES z wyborem kwestionariuszy.
```

## Domyślne ścieżki

```txt
SUPER_ADMIN
→ /dashboard

TENANT_OWNER / TENANT_ADMIN / TENANT_MEMBER / CONSULTANT
→ /t/[tenantSlug]/dashboard

REPORT_VIEWER
→ /my/reports

RESPONDENT / user without tenant membership
→ /my/assessment
```

## Ważna zasada biznesowa

Brak aktywnego `tenant_membership` nie jest błędem.

Jest to poprawny przypadek biznesowy oznaczający, że użytkownik może być zwykłym użytkownikiem końcowym lub respondentem, który powinien zobaczyć domyślne badanie HUMANET VALUES.

Niedozwolone zachowanie:

```txt
User has no tenant membership
→ error / access denied
```

Dozwolone zachowanie:

```txt
User has no tenant membership
→ /my/assessment
```

## Domyślne badanie użytkownika

Użytkownik, który nie ma dostępu administracyjnego ani tenantowego, powinien po zalogowaniu zobaczyć zdefiniowane domyślne badanie.

Widok powinien zawierać:

```txt
1. Nagłówek badania.
2. Krótką instrukcję.
3. Listę dostępnych kwestionariuszy.
4. Status każdego kwestionariusza.
5. Możliwość rozpoczęcia wybranego kwestionariusza.
6. Informację o postępie, jeśli użytkownik rozpoczął już wypełnianie.
7. Dostęp do raportu, jeśli został odblokowany.
```

Przykładowy flow:

```txt
login
→ /my/assessment
→ wybór kwestionariusza
→ zgoda / instrukcja
→ wypełnianie kwestionariusza
→ sprawdzenie kompletności
→ zakończenie
→ ewentualny dostęp do raportu
```

## Proponowana struktura tras

```txt
app/
  (protected)/
    my/
      assessment/
        page.tsx
      assessment/
        [assessmentId]/
          page.tsx
      session/
        [sessionId]/
          page.tsx
      reports/
        page.tsx
```

Minimalna trasa na start:

```txt
app/(protected)/my/assessment/page.tsx
```

## Proponowany feature

```txt
features/
  my-assessment/
    api/
      my-assessment.queries.ts
      my-assessment.mutations.ts
    components/
      my-assessment-page.tsx
      questionnaire-selection-card.tsx
    types/
      my-assessment.types.ts
    index.ts
```

## Przykładowa funkcja przekierowania

```ts
export async function resolvePostLoginRedirect(userId: string) {
  const user = await getUserById(userId);

  if (!user) {
    return "/login";
  }

  if (user.globalRole === "SUPER_ADMIN") {
    return "/dashboard";
  }

  const memberships = await listActiveTenantMemberships(userId);

  if (memberships.length > 0) {
    const preferredTenant = resolvePreferredTenant(memberships);

    return `/t/${preferredTenant.tenantSlug}/dashboard`;
  }

  const reportAccess = await listActiveReportAccessGrants(userId);

  if (reportAccess.length > 0) {
    return "/my/reports";
  }

  return "/my/assessment";
}
```

## Reguły bezpieczeństwa

Nawet jeżeli użytkownik trafia do prostego widoku domyślnego badania, backend nadal musi egzekwować pełne zasady bezpieczeństwa.

Każda operacja musi sprawdzić:

```txt
1. Czy użytkownik jest zalogowany.
2. Czy użytkownik ma dostęp do danego badania.
3. Czy dana sesja należy do tego użytkownika/respondenta.
4. Czy kwestionariusz jest dostępny.
5. Czy sesja nie wygasła.
6. Czy projekt lub domyślne badanie jest aktywne.
7. Czy raport może zostać pokazany.
```

Nie wolno polegać wyłącznie na ukryciu elementów w UI.

## Reguły dla respondenta / zwykłego użytkownika

Użytkownik końcowy nie powinien widzieć panelu administracyjnego.

Widok użytkownika powinien być:

```txt
prosty
czytelny
responsywny
bez sidebaru administracyjnego
bez technicznego języka
bez dostępu do danych innych osób
```

Użytkownik powinien widzieć wyłącznie:

```txt
swoje dostępne badania
swoje rozpoczęte sesje
swoje zakończone sesje
swoje raporty, jeśli zostały odblokowane
```

## Domyślne badanie a tenant

Domyślne badanie może być skonfigurowane globalnie w control DB.

Na start dopuszczalny wariant:

```txt
system_settings
  key
  value
```

Przykład wartości:

```json
{
  "defaultAssessmentId": "humanet-values-default",
  "enabledQuestionnaireCodes": ["VALUES", "CHANGE", "SAV"]
}
```

Docelowo można rozważyć osobne tabele:

```txt
default_assessments
default_assessment_questionnaires
default_assessment_access_rules
```

## Minimalny model koncepcyjny

```txt
DefaultAssessment
  id
  code
  name
  description
  status
  created_at
  updated_at

DefaultAssessmentQuestionnaire
  id
  default_assessment_id
  questionnaire_version_id
  order
  status
  created_at
  updated_at
```

## Statusy kwestionariusza w domyślnym badaniu

```txt
available
in_progress
completed
locked
coming_soon
disabled
```

## Przykładowe komunikaty UI

Dobre:

```txt
Wybierz kwestionariusz, który chcesz wypełnić w ramach badania HUMANET VALUES.
```

```txt
Ten kwestionariusz jest jeszcze niedostępny. Pojawi się tutaj po jego opublikowaniu.
```

```txt
Masz rozpoczętą sesję. Możesz kontynuować od miejsca, w którym przerwano.
```

Złe:

```txt
No tenant membership found.
```

```txt
403 unauthorized tenant context.
```

```txt
Missing assessment_session relation.
```

## Kryteria ukończenia pierwszej implementacji

```txt
[ ] Po zalogowaniu użytkownik bez tenant membership trafia na /my/assessment
[ ] Użytkownik z tenant membership trafia do panelu tenanta
[ ] SUPER_ADMIN trafia do /dashboard
[ ] Brak tenant membership nie powoduje błędu
[ ] Widok /my/assessment pokazuje domyślne badanie
[ ] Widok /my/assessment pokazuje listę kwestionariuszy
[ ] Użytkownik nie widzi panelu administracyjnego, jeśli nie ma odpowiednich ról
[ ] Backend blokuje dostęp do zasobów spoza zakresu użytkownika
[ ] Logika przekierowania jest testowalna jako osobna funkcja
```

## Notatka implementacyjna

Na etapie fundamentu aplikacji dopuszczalny jest placeholder widoku `/my/assessment` z tymczasową listą kwestionariuszy.

Docelowo lista kwestionariuszy musi pochodzić z wersjonowanych definicji kwestionariuszy i konfiguracji domyślnego badania.

Nie wolno wiązać działania domyślnego badania z aktualną, mutowalną definicją kwestionariusza bez zapisu wersji lub snapshotu.
