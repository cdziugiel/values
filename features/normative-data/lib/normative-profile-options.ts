export const NORMATIVE_PROFILE_SCHEMA_VERSION = "1.0" as const;
export const NORMATIVE_DICTIONARY_VERSION = "2026-01" as const;
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

export const EDUCATION_LEVEL_OPTIONS = [
  { value: "primary", label: "Podstawowe" },
  { value: "vocational", label: "Branżowe / zawodowe" },
  { value: "secondary", label: "Średnie" },
  { value: "post_secondary", label: "Policealne" },
  { value: "bachelor", label: "Wyższe I stopnia" },
  { value: "master", label: "Wyższe II stopnia / jednolite magisterskie" },
  { value: "doctorate", label: "Doktorat lub wyższe" },
  { value: "other", label: "Inne" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
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

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "employed", label: "Pracuję" },
  { value: "self_employed", label: "Prowadzę działalność / firmę" },
  { value: "student", label: "Uczę się / studiuję" },
  { value: "unemployed", label: "Obecnie nie pracuję" },
  { value: "retired", label: "Emerytura / renta" },
  { value: "other", label: "Inna sytuacja" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;

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

export const EMPLOYMENT_SECTOR_OPTIONS = [
  { value: "private", label: "Sektor prywatny" },
  { value: "public", label: "Sektor publiczny" },
  { value: "ngo", label: "Organizacja pozarządowa" },
  { value: "mixed", label: "Sektor mieszany" },
  { value: "not_applicable", label: "Nie dotyczy" },
  { value: "prefer_not_to_say", label: "Wolę nie podawać" },
] as const;
