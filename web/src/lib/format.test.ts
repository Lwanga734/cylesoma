import { describe, expect, it } from 'vitest';
import { formatDate, safeHexColor, slugify } from './format';
import { safeNext } from './safe-next';

describe('safeHexColor', () => {
  it('accepts #rrggbb and falls back otherwise', () => {
    expect(safeHexColor('#0075E7')).toBe('#0075e7');
    expect(safeHexColor('red')).toBe('#053065');
    expect(safeHexColor('#12345')).toBe('#053065');
    expect(safeHexColor(null)).toBe('#053065');
  });
});

describe('formatDate', () => {
  it('formats dates and date strings without timezone drift', () => {
    expect(formatDate(new Date(2027, 1, 1))).toBe('2027-02-01');
    expect(formatDate('2027-02-01')).toBe('2027-02-01');
  });
});

describe('safeNext', () => {
  it('allows only same-site relative paths', () => {
    expect(safeNext('/set-password')).toBe('/set-password');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
    expect(safeNext(null, '/x')).toBe('/x');
  });
});

describe('slugify', () => {
  it('makes safe web names', () => {
    expect(slugify("St. Mary's Primary School")).toBe('st-mary-s-primary-school');
    expect(slugify('  Kampala   Parents’ School ')).toBe('kampala-parents-school');
    expect(slugify('Écolé Test')).toBe('ecole-test');
    expect(slugify('***')).toBe('');
    expect(slugify('a'.repeat(80)).length).toBe(50);
  });
});
