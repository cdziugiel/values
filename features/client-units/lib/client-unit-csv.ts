import type { ClientUnitType } from "../forms/client-unit.schema";
import type { ClientUnitListItem } from "../types/client-unit.types";

export type ClientUnitCsvRow = {
  rowNumber: number;
  clientOrganizationName: string;
  name: string;
  type: ClientUnitType;
  parentName?: string;
};

export type ClientUnitImportError = {
  row: number;
  message: string;
};

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 2;
const MAX_ROWS = 5000;

const HEADERS = [
  "clientOrganizationName",
  "name",
  "type",
  "parentName",
] as const;

const ALLOWED_TYPES: ClientUnitType[] = [
  "organization",
  "division",
  "department",
  "team",
  "other",
];

type Header = (typeof HEADERS)[number];

function normalizeCell(value: string | undefined) {
  const normalized = String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

  return normalized || undefined;
}

export function normalizeClientUnitLookup(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function detectDelimiter(headerLine: string) {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;

  return semicolons >= commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);

  return result;
}

export function buildClientUnitsCsvTemplate() {
  return [
    "\uFEFF" + HEADERS.join(";"),
    ["ACME", "Zarząd", "division", ""].join(";"),
    ["ACME", "HR", "department", "Zarząd"].join(";"),
    ["ACME", "Produkcja", "department", "Zarząd"].join(";"),
    ["ACME", "Zespół A", "team", "Produkcja"].join(";"),
  ].join("\n");
}

export async function parseClientUnitsCsvFile(file: File): Promise<{
  rows: ClientUnitCsvRow[];
  errors: ClientUnitImportError[];
}> {
  const errors: ClientUnitImportError[] = [];

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: "Plik jest za duży. Maksymalny rozmiar to 2 MB.",
        },
      ],
    };
  }

  const text = await file.text();

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: "Plik musi zawierać nagłówki i przynajmniej jeden wiersz.",
        },
      ],
    };
  }

  if (lines.length - 1 > MAX_ROWS) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `Plik zawiera za dużo wierszy. Maksimum to ${MAX_ROWS}.`,
        },
      ],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) =>
    normalizeCell(header),
  );

  const unknownHeaders = headers.filter(
    (header) => header && !HEADERS.includes(header as Header),
  );

  if (unknownHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `Nieznane kolumny: ${unknownHeaders.join(", ")}.`,
        },
      ],
    };
  }

  const missingHeaders = HEADERS.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `Brak wymaganych kolumn: ${missingHeaders.join(", ")}.`,
        },
      ],
    };
  }

  const rows: ClientUnitCsvRow[] = [];
  const seenKeys = new Set<string>();

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowNumber = lineIndex + 1;
    const cells = parseCsvLine(lines[lineIndex], delimiter);

    const raw = Object.fromEntries(
      headers.map((header, index) => [header, normalizeCell(cells[index])]),
    ) as Partial<Record<Header, string>>;

    const clientOrganizationName = normalizeCell(raw.clientOrganizationName);
    const name = normalizeCell(raw.name);
    const type = normalizeCell(raw.type) as ClientUnitType | undefined;
    const parentName = normalizeCell(raw.parentName);

    if (!clientOrganizationName) {
      errors.push({
        row: rowNumber,
        message: "Brakuje clientOrganizationName.",
      });
      continue;
    }

    if (!name) {
      errors.push({
        row: rowNumber,
        message: "Brakuje name.",
      });
      continue;
    }

    if (!type) {
      errors.push({
        row: rowNumber,
        message: "Brakuje type.",
      });
      continue;
    }

    if (!ALLOWED_TYPES.includes(type)) {
      errors.push({
        row: rowNumber,
        message: `Niepoprawny type: ${type}. Dozwolone: ${ALLOWED_TYPES.join(
          ", ",
        )}.`,
      });
      continue;
    }

    if (parentName && normalizeClientUnitLookup(parentName) === normalizeClientUnitLookup(name)) {
      errors.push({
        row: rowNumber,
        message: "Jednostka nie może być własną jednostką nadrzędną.",
      });
      continue;
    }

    const key = [
      normalizeClientUnitLookup(clientOrganizationName),
      normalizeClientUnitLookup(name),
    ].join("::");

    if (seenKeys.has(key)) {
      errors.push({
        row: rowNumber,
        message: `Duplikat jednostki w pliku: ${clientOrganizationName} / ${name}.`,
      });
      continue;
    }

    seenKeys.add(key);

    rows.push({
      rowNumber,
      clientOrganizationName,
      name,
      type,
      parentName,
    });
  }

  return {
    rows,
    errors,
  };
}

export function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');

  if (/[",;\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function clientUnitsToCsv(items: ClientUnitListItem[]) {
  const rows = items.map((item) =>
    [
      item.clientOrganizationName,
      item.name,
      item.type,
      item.parentName,
    ]
      .map(escapeCsvCell)
      .join(";"),
  );

  return ["\uFEFF" + HEADERS.join(";"), ...rows].join("\n");
}