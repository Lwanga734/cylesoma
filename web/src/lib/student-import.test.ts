import { describe, expect, it } from 'vitest';
import { normalizeHeader, parseBoarding, parseDate, parseStudentRecords } from './student-import';

const TODAY = new Date('2026-11-04T00:00:00Z');

describe('parseDate', () => {
  it('accepts ISO and day-first dates', () => {
    expect(parseDate('2015-03-02', TODAY)).toBe('2015-03-02');
    expect(parseDate('12/03/2015', TODAY)).toBe('2015-03-12');
    expect(parseDate('4-11-2014', TODAY)).toBe('2014-11-04');
  });
  it('rejects impossible, future and ancient dates', () => {
    expect(parseDate('31/02/2015', TODAY)).toBeNull();
    expect(parseDate('01/01/2030', TODAY)).toBeNull();
    expect(parseDate('01/01/1900', TODAY)).toBeNull();
    expect(parseDate('March 2015', TODAY)).toBeNull();
  });
});

describe('parseBoarding', () => {
  it('understands common words', () => {
    expect(parseBoarding('Yes')).toBe(true);
    expect(parseBoarding('boarder')).toBe(true);
    expect(parseBoarding('Day')).toBe(false);
    expect(parseBoarding('')).toBe(false);
    expect(parseBoarding('maybe')).toBeNull();
  });
});

describe('parseStudentRecords', () => {
  const fields = ['Admission No.', 'First Name', 'Surname', 'Class', 'DOB', 'Boarding'];

  it('maps header aliases and cleans values', () => {
    const r = parseStudentRecords(fields, [
      { 'Admission No.': ' A001 ', 'First Name': 'Aisha', Surname: 'Nakato', Class: 'P5', DOB: '12/03/2015', Boarding: 'no' },
    ]);
    expect(r.issues).toEqual([]);
    expect(r.rows).toEqual([
      { admission_no: 'A001', first_name: 'Aisha', last_name: 'Nakato', class_name: 'P5', date_of_birth: '2015-03-12', boarding: false },
    ]);
  });

  it('reports missing required columns', () => {
    expect(parseStudentRecords(['First Name', 'Surname'], []).missingColumns).toEqual(['admission_no']);
  });

  it('keeps good rows, reports bad ones with their file line, and drops repeats', () => {
    const r = parseStudentRecords(fields, [
      { 'Admission No.': 'A1', 'First Name': 'Ann', Surname: 'One', Class: '', DOB: '', Boarding: '' },
      { 'Admission No.': 'A2', 'First Name': '', Surname: 'Two', Class: '', DOB: '', Boarding: '' },
      { 'Admission No.': 'a1', 'First Name': 'Dup', Surname: 'Licate', Class: '', DOB: '', Boarding: '' },
      { 'Admission No.': 'A3', 'First Name': 'Cy', Surname: 'Three', Class: '', DOB: '31/02/2015', Boarding: 'x' },
      { 'Admission No.': '', 'First Name': '', Surname: '', Class: '', DOB: '', Boarding: '' },
    ]);
    expect(r.rows.map((x) => x.admission_no)).toEqual(['A1']);
    expect(r.issues.map((i) => i.line)).toEqual([3, 4, 5]);
    expect(r.issues[1].message).toContain('repeated');
  });

  it('refuses files over the row limit', () => {
    const many = Array.from({ length: 2001 }, (_, i) => ({ 'Admission No.': `A${i}`, 'First Name': 'x', Surname: 'y', Class: '', DOB: '', Boarding: '' }));
    const r = parseStudentRecords(fields, many);
    expect(r.rows).toHaveLength(0);
    expect(r.issues[0].message).toContain('limit');
  });
});

describe('normalizeHeader', () => {
  it('lowercases and snake_cases', () => {
    expect(normalizeHeader(' Admission No. ')).toBe('admission_no');
  });
});
