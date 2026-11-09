export type ImportRow = {
  admission_no: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  date_of_birth: string | null; // ISO yyyy-mm-dd
  boarding: boolean;
};
export type ImportIssue = { line: number; message: string };
export type ImportResult = { rows: ImportRow[]; issues: ImportIssue[]; missingColumns: string[] };

export const MAX_IMPORT_ROWS = 2000;

const ALIASES: Record<keyof ImportRow, string[]> = {
  admission_no: ['admission_no', 'admission_number', 'admission', 'adm_no', 'adm', 'reg_no', 'registration_no', 'student_no', 'student_number', 'id'],
  first_name: ['first_name', 'firstname', 'given_name', 'first'],
  last_name: ['last_name', 'lastname', 'surname', 'family_name', 'last'],
  class_name: ['class', 'class_name', 'grade', 'form'],
  date_of_birth: ['date_of_birth', 'dob', 'birth_date', 'birthdate'],
  boarding: ['boarding', 'boarder', 'residence', 'day_boarding', 'type'],
};

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Accepts yyyy-mm-dd and the day-first formats used locally (dd/mm/yyyy, d-m-yyyy). Returns ISO or null. */
export function parseDate(value: string, today = new Date()): string | null {
  const v = value.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (y < 1950 || date.getTime() > today.getTime()) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** true = boarder, false = day scholar, null = not understood. Blank means day scholar. */
export function parseBoarding(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (v === '') return false;
  if (['yes', 'y', 'true', '1', 'boarding', 'boarder', 'b'].includes(v)) return true;
  if (['no', 'n', 'false', '0', 'day', 'day scholar', 'd'].includes(v)) return false;
  return null;
}

/** Turns CSV records into validated rows. `fields` are the raw header names from the file. */
export function parseStudentRecords(fields: string[], records: Record<string, string>[]): ImportResult {
  const byCanonical = new Map<keyof ImportRow, string>();
  for (const [canonical, aliases] of Object.entries(ALIASES) as [keyof ImportRow, string[]][]) {
    const found = fields.find((f) => aliases.includes(normalizeHeader(f)));
    if (found) byCanonical.set(canonical, found);
  }
  const required: (keyof ImportRow)[] = ['admission_no', 'first_name', 'last_name'];
  const missingColumns = required.filter((k) => !byCanonical.has(k));
  if (missingColumns.length > 0) return { rows: [], issues: [], missingColumns };

  const issues: ImportIssue[] = [];
  const rows: ImportRow[] = [];
  const seen = new Map<string, number>();
  const get = (rec: Record<string, string>, key: keyof ImportRow) => {
    const col = byCanonical.get(key);
    return col ? String(rec[col] ?? '').trim() : '';
  };

  if (records.length > MAX_IMPORT_ROWS) {
    issues.push({ line: 0, message: `The file has ${records.length} rows; the limit is ${MAX_IMPORT_ROWS} per import. Split it and import in parts.` });
    return { rows: [], issues, missingColumns };
  }

  records.forEach((rec, i) => {
    const line = i + 2; // header is line 1
    const admission = get(rec, 'admission_no');
    const first = get(rec, 'first_name');
    const last = get(rec, 'last_name');
    const className = get(rec, 'class_name');
    const dobRaw = get(rec, 'date_of_birth');
    const boardingRaw = get(rec, 'boarding');

    if (!admission && !first && !last) return; // blank line
    const problems: string[] = [];
    if (!admission) problems.push('admission number is missing');
    else if (admission.length > 40) problems.push('admission number is longer than 40 characters');
    if (!first) problems.push('first name is missing');
    else if (first.length > 80) problems.push('first name is too long');
    if (!last) problems.push('last name is missing');
    else if (last.length > 80) problems.push('last name is too long');
    if (className.length > 60) problems.push('class name is longer than 60 characters');

    let dob: string | null = null;
    if (dobRaw) {
      dob = parseDate(dobRaw);
      if (!dob) problems.push(`date of birth "${dobRaw}" is not a valid past date (use dd/mm/yyyy)`);
    }
    const boarding = parseBoarding(boardingRaw);
    if (boarding === null) problems.push(`boarding value "${boardingRaw}" is not understood (use yes or no)`);

    const key = admission.toLowerCase();
    if (admission && seen.has(key)) problems.push(`admission number ${admission} is repeated (first on line ${seen.get(key)})`);

    if (problems.length > 0) {
      issues.push({ line, message: problems.join('; ') });
      return;
    }
    seen.set(key, line);
    rows.push({
      admission_no: admission,
      first_name: first,
      last_name: last,
      class_name: className || null,
      date_of_birth: dob,
      boarding: boarding === true,
    });
  });

  return { rows, issues, missingColumns };
}
