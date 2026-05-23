import type { RespondentListItem } from "../types/respondent.types";

export type RespondentCsvRow = {
  rowNumber: number;
  externalCode?: string;
  clientOrganizationName?: string;
  clientUnitName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type RespondentImportError = {
  row: number;
  message: string;
};

export type ParsedRespondentsCsv = {
  rows: RespondentCsvRow[];
  errors: RespondentImportError[];
};

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 2;
const MAX_ROWS = 5000;

const HEADERS = [
  "externalCode",
  "clientOrganizationName",
  "clientUnitName",
  "email",
  "firstName",
  "lastName",
  "phone",
] as const;

type Header = (typeof HEADERS)[number];

function normalizeCell(value: string | undefined) {
  const normalized = String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

  return normalized || undefined;
}

function normalizeEmail(value: string | undefined) {
  return normalizeCell(value)?.toLowerCase();
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildRespondentsCsvTemplate() {
  return [
    "\uFEFF" + HEADERS.join(";"),
    [
      "EMP-001",
      "ACME",
      "Sprzedaż",
      "anna.kowalska@example.com",
      "Anna",
      "Kowalska",
      "+48123123123",
    ].join(";"),
  ].join("\n");
}

export async function parseRespondentsCsvFile(
  file: File,
): Promise<ParsedRespondentsCsv> {
  const errors: RespondentImportError[] = [];

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

  const rows: RespondentCsvRow[] = [];
  const seenEmails = new Set<string>();
  const seenExternalCodes = new Set<string>();

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowNumber = lineIndex + 1;
    const cells = parseCsvLine(lines[lineIndex], delimiter);

    const raw = Object.fromEntries(
      headers.map((header, index) => [header, normalizeCell(cells[index])]),
    ) as Partial<Record<Header, string>>;

    const email = normalizeEmail(raw.email);
    const externalCode = normalizeCell(raw.externalCode);

    if (!email && !externalCode) {
      errors.push({
        row: rowNumber,
        message: "Podaj email albo externalCode.",
      });
      continue;
    }

    if (email && !isValidEmail(email)) {
      errors.push({
        row: rowNumber,
        message: `Niepoprawny email: ${email}.`,
      });
      continue;
    }

    if (email) {
      if (seenEmails.has(email)) {
        errors.push({
          row: rowNumber,
          message: `Duplikat emaila w pliku: ${email}.`,
        });
        continue;
      }

      seenEmails.add(email);
    }

    if (externalCode) {
      const normalizedCode = externalCode.toLowerCase();

      if (seenExternalCodes.has(normalizedCode)) {
        errors.push({
          row: rowNumber,
          message: `Duplikat externalCode w pliku: ${externalCode}.`,
        });
        continue;
      }

      seenExternalCodes.add(normalizedCode);
    }

    rows.push({
      rowNumber,
      externalCode,
      clientOrganizationName: normalizeCell(raw.clientOrganizationName),
      clientUnitName: normalizeCell(raw.clientUnitName),
      email,
      firstName: normalizeCell(raw.firstName),
      lastName: normalizeCell(raw.lastName),
      phone: normalizeCell(raw.phone),
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

export function respondentsToCsv(items: RespondentListItem[]) {
  const rows = items.map((item) =>
    [
      item.externalCode,
      item.clientOrganizationName,
      item.clientUnitName,
      item.email,
      item.firstName,
      item.lastName,
      item.phone,
    ]
      .map(escapeCsvCell)
      .join(";"),
  );

  return ["\uFEFF" + HEADERS.join(";"), ...rows].join("\n");
}