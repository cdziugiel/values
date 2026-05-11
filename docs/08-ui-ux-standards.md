# 08 — Standardy UI/UX

## Założenie

UI HUMANET VALUES v2 ma być profesjonalne, spokojne, czytelne i przyjemne. System obsługuje dane psychometryczne, więc interfejs powinien budować poczucie zaufania, porządku i kontroli.

Podstawą UI jest shadcn/ui oraz własne komponenty aplikacyjne w `shared/ui`.

## Główne wzorce UI

W `shared/ui` powinny powstać komponenty aplikacyjne:

```txt
AppShell
Sidebar
Topbar
Breadcrumbs
PageHeader
PageToolbar
PageSection
DataTable
EmptyState
LoadingState
ErrorState
ConfirmDialog
SheetForm
DetailPanel
StatusBadge
Stepper
PermissionGate
```

## Layout aplikacji

Panel administracyjny powinien mieć:

```txt
sidebar nawigacyjny
topbar z kontekstem użytkownika i tenanta
breadcrumb
nagłówek strony
obszar akcji strony
czytelny content area
```

## Ścieżka respondenta

Respondent powinien mieć maksymalnie prosty flow:

```txt
link
→ zgoda
→ instrukcja
→ kwestionariusz
→ sprawdzenie kompletności
→ zakończenie
→ ewentualny dostęp do raportu
```

UI respondenta powinno być:

- minimalistyczne,
- bez panelu administracyjnego,
- responsywne,
- pozbawione rozpraszaczy,
- z jasnym paskiem postępu,
- z dobrym zapisem częściowych odpowiedzi.

## Ścieżka tenanta/admina

Admin lub konsultant powinien mieć flow:

```txt
klient
→ projekt badania
→ wybór kwestionariusza
→ respondenci
→ wysyłka zaproszeń
→ monitoring postępu
→ scoring
→ raporty
→ dostęp/udostępnianie
```

## Stany danych

Każda lista i ekran powinny obsługiwać:

```txt
loading
empty
error
success
partial data
no permission
```

Nie zostawiać pustych ekranów bez informacji.

## Komunikaty

Komunikaty powinny być:

- konkretne,
- neutralne,
- profesjonalne,
- bez ujawniania szczegółów technicznych,
- pomocne w następnym kroku.

Złe:

```txt
Error 500
```

Dobre:

```txt
Nie udało się pobrać projektów badawczych. Odśwież stronę lub skontaktuj się z administratorem, jeśli problem się powtarza.
```

## Tabele

Tabele powinny wspierać:

```txt
sortowanie
filtrowanie
wyszukiwanie
paginację
widoczność kolumn
akcje wiersza
bulk actions, jeśli potrzebne
czytelne empty states
```

## Formularze

Formularze powinny mieć:

```txt
jasne etykiety
opisy pól przy trudnych pojęciach
walidację inline
komunikaty błędów przy polach
stan zapisywania
ochronę przed przypadkowym zamknięciem, jeśli są niezapisane zmiany
```

## Statusy

Statusy powinny być reprezentowane przez spójne badge’e.

Przykład dla projektu badawczego:

```txt
Draft
Active
Closed
Archived
```

Przykład dla sesji respondenta:

```txt
Invited
Opened
In progress
Completed
Expired
Cancelled
```

## Raporty

Raporty powinny mieć tryb:

```txt
preview
final generated
shared/downloadable
```

Dostęp do raportu musi być kontrolowany i audytowany.

## Dostępność

UI powinno respektować:

- semantyczny HTML,
- focus states,
- obsługę klawiaturą,
- kontrast,
- etykiety pól,
- brak ukrywania istotnych informacji wyłącznie kolorem.

## Mobile

Panel administracyjny może być zoptymalizowany głównie pod desktop/tablet, ale flow respondenta musi działać bardzo dobrze na mobile.

## Design tone

Styl powinien być:

```txt
profesjonalny
spokojny
precyzyjny
nowoczesny
nieprzeładowany
z dużą czytelnością danych
```
