// @humanet-normative-profile-v1_1
export const NORMATIVE_PROFILE_SCHEMA_VERSION = "1.2" as const;
export const NORMATIVE_DICTIONARY_VERSION = "2026-09-10" as const;
export const NORMATIVE_CONSENT_VERSION = "2026-01" as const;

export const SEX_OPTIONS = [
  { value: "female", label: "Kobieta" },
  { value: "male", label: "Mężczyzna" },
  { value: "other", label: "Inna odpowiedź" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

export const VOIVODESHIP_OPTIONS = [
  { value: "02", label: "dolnośląskie" },
  { value: "04", label: "kujawsko-pomorskie" },
  { value: "06", label: "lubelskie" },
  { value: "08", label: "lubuskie" },
  { value: "10", label: "łódzkie" },
  { value: "12", label: "małopolskie" },
  { value: "14", label: "mazowieckie" },
  { value: "16", label: "opolskie" },
  { value: "18", label: "podkarpackie" },
  { value: "20", label: "podlaskie" },
  { value: "22", label: "pomorskie" },
  { value: "24", label: "śląskie" },
  { value: "26", label: "świętokrzyskie" },
  { value: "28", label: "warmińsko-mazurskie" },
  { value: "30", label: "wielkopolskie" },
  { value: "32", label: "zachodniopomorskie" },
  { value: "outside_poland", label: "Poza Polską" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

export const LOCALITY_SIZE_OPTIONS = [
  { value: "village", label: "Wieś" },
  { value: "city_under_20k", label: "Miasto do 20 tys. mieszkańców" },
  { value: "city_20k_50k", label: "Miasto 20–50 tys. mieszkańców" },
  { value: "city_50k_100k", label: "Miasto 50–100 tys. mieszkańców" },
  { value: "city_100k_250k", label: "Miasto 100–250 tys. mieszkańców" },
  { value: "city_250k_500k", label: "Miasto 250–500 tys. mieszkańców" },
  { value: "city_over_500k", label: "Miasto powyżej 500 tys. mieszkańców" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

/**
 * v1.1: kategorie rozłączne, możliwe do jednoznacznej agregacji do BAEL/GUS.
 * Wartości legacy "primary" / "vocational" / "secondary" są zachowane osobno
 * wyłącznie do odczytu starych profili v1.0.
 */
export const EDUCATION_LEVEL_OPTIONS = [
  { value: "primary_or_lower", label: "Podstawowe lub niższe" },
  { value: "lower_secondary", label: "Gimnazjalne" },
  { value: "basic_vocational_branch", label: "Zasadnicze zawodowe / branżowe I stopnia" },
  { value: "general_secondary", label: "Średnie ogólnokształcące" },
  { value: "vocational_secondary_branch", label: "Średnie zawodowe / techniczne / branżowe II stopnia" },
  { value: "post_secondary", label: "Policealne" },
  { value: "bachelor", label: "Wyższe I stopnia — licencjat / inżynier" },
  { value: "master", label: "Wyższe II stopnia / jednolite magisterskie" },
  { value: "doctorate", label: "Doktorat lub wyższe" },
  { value: "other", label: "Inne" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

export const LEGACY_EDUCATION_LEVEL_OPTIONS = [
  { value: "primary", label: "Podstawowe (starszy zapis)" },
  { value: "vocational", label: "Branżowe / zawodowe (starszy, niejednoznaczny zapis)" },
  { value: "secondary", label: "Średnie (starszy, niejednoznaczny zapis)" },
] as const;

export const ALL_EDUCATION_LEVEL_OPTIONS = [
  ...EDUCATION_LEVEL_OPTIONS,
  ...LEGACY_EDUCATION_LEVEL_OPTIONS,
] as const;

export const EDUCATION_FIELD_OPTIONS = [
  { value: "general", label: "Kształcenie ogólne" },
  { value: "education", label: "Pedagogika" },
  { value: "humanities_arts", label: "Nauki humanistyczne i sztuka" },
  { value: "social_sciences", label: "Nauki społeczne" },
  { value: "business_law", label: "Biznes, administracja i prawo" },
  { value: "natural_sciences", label: "Nauki przyrodnicze" },
  { value: "mathematics_statistics", label: "Matematyka i statystyka" },
  { value: "ict", label: "Technologie informacyjne" },
  { value: "engineering_manufacturing", label: "Inżynieria i produkcja" },
  { value: "agriculture", label: "Rolnictwo" },
  { value: "health_welfare", label: "Zdrowie i opieka społeczna" },
  { value: "services", label: "Usługi" },
  { value: "other", label: "Inna" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

/** Legacy — utrzymane dla kompatybilności admina i starych rekordów. */
export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "employed", label: "Pracuję" },
  { value: "self_employed", label: "Prowadzę działalność / firmę" },
  { value: "student", label: "Uczę się / studiuję" },
  { value: "unemployed", label: "Obecnie nie pracuję" },
  { value: "retired", label: "Emerytura / renta" },
  { value: "other", label: "Inna sytuacja" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

// @humanet-normative-work-situation-v1_2-options
export const WORK_SITUATION_OPTIONS = [
  { value: "working", label: "Pracuję" },
  { value: "temporarily_not_working", label: "Mam pracę lub działalność, ale obecnie czasowo nie pracuję" },
  { value: "not_working", label: "Obecnie nie pracuję" },
] as const;

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Tak" },
  { value: "no", label: "Nie" },
] as const;

export const TEMPORARY_ABSENCE_OPTIONS = [
  ...YES_NO_OPTIONS,
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

export const EMPLOYMENT_FORM_OPTIONS = [
  { value: "employee", label: "Jestem pracownikiem zatrudnionym przez pracodawcę" },
  { value: "self_employed_no_employees", label: "Prowadzę własną działalność i nie zatrudniam pracowników" },
  { value: "employer", label: "Prowadzę działalność / firmę i zatrudniam pracowników" },
  { value: "unpaid_family_worker", label: "Pomagam bez wynagrodzenia w rodzinnej działalności lub gospodarstwie" },
  { value: "other", label: "Inna forma pracy" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

export const WORK_TIME_OPTIONS = [
  { value: "full_time", label: "W pełnym wymiarze" },
  { value: "part_time", label: "W niepełnym wymiarze" },
  { value: "difficult_to_say", label: "Trudno powiedzieć" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

/** PKD 2025 — sekcje A–V. */
export const INDUSTRY_SECTION_OPTIONS = [
  { value: "A", label: "Rolnictwo, leśnictwo i rybactwo" },
  { value: "B", label: "Górnictwo i wydobywanie" },
  { value: "C", label: "Przetwórstwo przemysłowe" },
  { value: "D", label: "Energetyka" },
  { value: "E", label: "Woda, ścieki, odpady i rekultywacja" },
  { value: "F", label: "Budownictwo" },
  { value: "G", label: "Handel hurtowy i detaliczny" },
  { value: "H", label: "Transport i gospodarka magazynowa" },
  { value: "I", label: "Zakwaterowanie i gastronomia" },
  { value: "J", label: "Wydawnictwa, media i dystrybucja treści" },
  { value: "K", label: "Telekomunikacja, IT i usługi informacyjne" },
  { value: "L", label: "Finanse i ubezpieczenia" },
  { value: "M", label: "Obsługa rynku nieruchomości" },
  { value: "N", label: "Działalność profesjonalna, naukowa i techniczna" },
  { value: "O", label: "Usługi administrowania i działalność wspierająca" },
  { value: "P", label: "Administracja publiczna i obrona" },
  { value: "Q", label: "Edukacja" },
  { value: "R", label: "Ochrona zdrowia i pomoc społeczna" },
  { value: "S", label: "Kultura, sport i rekreacja" },
  { value: "T", label: "Pozostała działalność usługowa" },
  { value: "U", label: "Gospodarstwa domowe zatrudniające pracowników" },
  { value: "V", label: "Organizacje i zespoły eksterytorialne" },
  { value: "other_unknown", label: "Nie wiem / żadna z powyższych" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

/** Legacy HUMANET industry — utrzymane dla starych rekordów i ekranów. */
export const INDUSTRY_OPTIONS = [
  { value: "manufacturing", label: "Produkcja" },
  { value: "energy", label: "Energetyka" },
  { value: "construction", label: "Budownictwo" },
  { value: "trade", label: "Handel" },
  { value: "transport_logistics", label: "Transport i logistyka" },
  { value: "finance_insurance", label: "Finanse i ubezpieczenia" },
  { value: "it_telecom", label: "IT i telekomunikacja" },
  { value: "professional_services", label: "Usługi profesjonalne" },
  { value: "public_administration", label: "Administracja publiczna" },
  { value: "education", label: "Edukacja" },
  { value: "healthcare", label: "Ochrona zdrowia" },
  { value: "culture_media", label: "Kultura i media" },
  { value: "hospitality", label: "Hotelarstwo i gastronomia" },
  { value: "agriculture", label: "Rolnictwo" },
  { value: "ngo", label: "Organizacje pozarządowe" },
  { value: "other", label: "Inna" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

export const OCCUPATION_MAJOR_GROUP_OPTIONS = [
  { value: "1", label: "Kierownicy i wyżsi urzędnicy" },
  { value: "2", label: "Specjaliści" },
  { value: "3", label: "Technicy i inny średni personel" },
  { value: "4", label: "Pracownicy biurowi" },
  { value: "5", label: "Pracownicy usług i sprzedawcy" },
  { value: "6", label: "Rolnicy, ogrodnicy, leśnicy i rybacy" },
  { value: "7", label: "Robotnicy przemysłowi i rzemieślnicy" },
  { value: "8", label: "Operatorzy i monterzy maszyn i urządzeń" },
  { value: "9", label: "Pracownicy wykonujący prace proste" },
  { value: "0", label: "Siły zbrojne" },
  { value: "unknown", label: "Trudno powiedzieć" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

export const JOB_LEVEL_OPTIONS = [
  { value: "intern", label: "Stażysta / praktykant" },
  { value: "employee", label: "Pracownik wykonawczy" },
  { value: "specialist", label: "Specjalista" },
  { value: "senior_expert", label: "Starszy specjalista / ekspert" },
  { value: "leader", label: "Lider / koordynator" },
  { value: "manager", label: "Kierownik" },
  { value: "director", label: "Dyrektor" },
  { value: "board_owner", label: "Zarząd / właściciel" },
  { value: "other", label: "Inna rola" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

export const JOB_FUNCTION_OPTIONS = [
  { value: "general_management", label: "Zarządzanie ogólne" },
  { value: "sales", label: "Sprzedaż" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finanse" },
  { value: "hr", label: "HR" },
  { value: "operations_production", label: "Operacje / produkcja" },
  { value: "logistics", label: "Logistyka" },
  { value: "it", label: "IT" },
  { value: "research_development", label: "Badania i rozwój" },
  { value: "quality", label: "Jakość" },
  { value: "legal_compliance", label: "Prawo / compliance" },
  { value: "customer_service", label: "Obsługa klienta" },
  { value: "administration", label: "Administracja" },
  { value: "education_training", label: "Edukacja / szkolenia" },
  { value: "healthcare", label: "Ochrona zdrowia" },
  { value: "other", label: "Inny" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

export const ORGANIZATION_SIZE_OPTIONS = [
  { value: "micro", label: "1–9 osób" },
  { value: "small", label: "10–49 osób" },
  { value: "medium", label: "50–249 osób" },
  { value: "large", label: "250 lub więcej osób" },
  { value: "not_applicable", label: "Nie dotyczy" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

export const OWNERSHIP_SECTOR_OPTIONS = [
  { value: "private", label: "Sektor prywatny" },
  { value: "public", label: "Sektor publiczny" },
  { value: "dont_know", label: "Nie wiem" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

/** Legacy — utrzymane dla kompatybilności. */
export const EMPLOYMENT_SECTOR_OPTIONS = [
  { value: "private", label: "Sektor prywatny" },
  { value: "public", label: "Sektor publiczny" },
  { value: "ngo", label: "Organizacja pozarządowa" },
  { value: "mixed", label: "Sektor mieszany" },
  { value: "not_applicable", label: "Nie dotyczy" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

export const MANAGES_PEOPLE_OPTIONS = [
  { value: "yes", label: "Tak" },
  { value: "no", label: "Nie" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;

export const ORGANIZATION_TENURE_OPTIONS = [
  { value: "under_6_months", label: "Krócej niż 6 miesięcy" },
  { value: "6_11_months", label: "6–11 miesięcy" },
  { value: "1_2_years", label: "1–2 lata" },
  { value: "3_5_years", label: "3–5 lat" },
  { value: "6_10_years", label: "6–10 lat" },
  { value: "11_plus_years", label: "11 lat lub dłużej" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
  { value: "not_applicable", label: "Nie dotyczy" },
] as const;
