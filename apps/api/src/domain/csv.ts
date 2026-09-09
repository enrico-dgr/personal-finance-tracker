import { parse } from 'csv-parse/sync';

export type ParsedCsvTransaction = {
  date: Date;
  originalDescription: string;
  amount: number;
};

type CsvRecord = Record<string, string>;

const dateKeys = ['date', 'data', 'operazione', 'bookingdate', 'valuedate', 'datacontabile'];
const descriptionKeys = ['description', 'descrizione', 'causale', 'details', 'dettagli'];
const amountKeys = ['amount', 'importo', 'valore', 'addebito', 'accredito'];
const debitKeys = ['uscite', 'addebito'];
const creditKeys = ['entrate', 'accredito'];

function stripQuotedSpacerLines(content: string) {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '"')
    .join('\n');
}

function findHeaderStart(content: string) {
  const lines = content.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    const normalizedLine = normalizeKey(line);

    return (
      normalizedLine.includes('operazione') &&
      normalizedLine.includes('descrizione') &&
      (normalizedLine.includes('uscite') ||
        normalizedLine.includes('entrate') ||
        normalizedLine.includes('importo') ||
        normalizedLine.includes('amount'))
    );
  });

  return headerIndex >= 0 ? lines.slice(headerIndex).join('\n') : content;
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function detectDelimiter(content: string) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;

  return semicolonCount > commaCount ? ';' : ',';
}

function pickField(record: CsvRecord, candidates: string[]) {
  const entries = Object.entries(record);

  for (const [key, value] of entries) {
    const normalized = normalizeKey(key);
    if (candidates.includes(normalized)) {
      return value;
    }
  }

  for (const [key, value] of entries) {
    const normalized = normalizeKey(key);
    if (candidates.some((candidate) => normalized.includes(candidate))) {
      return value;
    }
  }

  return undefined;
}

function parseDate(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00.000Z`);
  }

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(/[/-]/);
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Invalid date value: ${value}`);
}

function parseAmount(value: string) {
  const compact = value.replace(/\s/g, '').replace(/€/g, '').replace(/\u00a0/g, '');

  let normalized = compact;
  if (compact.includes(',') && compact.includes('.')) {
    normalized = compact.replace(/\./g, '').replace(',', '.');
  } else if (compact.includes(',')) {
    normalized = compact.replace(',', '.');
  }

  const amount = Number(normalized);
  if (Number.isNaN(amount)) {
    throw new Error(`Invalid amount value: ${value}`);
  }

  return amount;
}

function parseRecordAmount(record: CsvRecord) {
  const amountValue = pickField(record, amountKeys)?.trim();
  if (amountValue) {
    return parseAmount(amountValue);
  }

  const debitValue = pickField(record, debitKeys)?.trim();
  if (debitValue) {
    const parsedDebit = parseAmount(debitValue);
    return parsedDebit > 0 ? -parsedDebit : parsedDebit;
  }

  const creditValue = pickField(record, creditKeys)?.trim();
  if (creditValue) {
    const parsedCredit = parseAmount(creditValue);
    return parsedCredit < 0 ? Math.abs(parsedCredit) : parsedCredit;
  }

  return undefined;
}

export function parseCsvTransactions(content: string): ParsedCsvTransaction[] {
  const preparedContent = stripQuotedSpacerLines(findHeaderStart(content));
  const delimiter = detectDelimiter(preparedContent);
  const records = parse(preparedContent, {
    bom: true,
    columns: true,
    delimiter,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true
  }) as CsvRecord[];

  return records.map((record, index) => {
    const dateValue = pickField(record, dateKeys);
    const descriptionValue = pickField(record, descriptionKeys);
    const amountValue = parseRecordAmount(record);

    if (!dateValue || !descriptionValue || amountValue === undefined) {
      throw new Error(`CSV row ${index + 2} is missing one of the required fields: date, description, amount.`);
    }

    return {
      date: parseDate(dateValue),
      originalDescription: descriptionValue.trim(),
      amount: amountValue
    };
  });
}
