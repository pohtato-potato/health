import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuickKcalForm, quickName } from '../../src/sheets/QuickKcalForm';

const form = () => renderToStaticMarkup(<QuickKcalForm onAdd={() => {}} />);

describe('Add food: the half stack, Quick kcal fixed (f4-half)', () => {
  it('stacks search, Same as yesterday, saved meals, then Quick kcal', () => {
    const src = readFileSync('src/sheets/AddFood.tsx', 'utf8');
    const at = ['af-search', 'af-yday', 'af-saved', '<QuickKcalForm'].map((k) => src.indexOf(k));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('asks for a name only if you want one, then kcal and protein', () => {
    const html = form();
    expect(html).toContain('Name (optional)');
    expect(html).toMatch(/Kcal/);
    expect(html).toMatch(/Protein g/);
  });

  it('says it is logged once and never saved as a food or a meal', () => {
    expect(form()).toContain('For a one-off: logged once, never saved as a food or a meal.');
  });

  it('offers "Protein not known" as a toggle, and "Add once"', () => {
    const html = form();
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Protein not known<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Add once<\/button>/);
  });

  it('names a nameless one "Quick kcal"', () => {
    expect(quickName('  ')).toBe('Quick kcal');
    expect(quickName(' Samosa ')).toBe('Samosa');
  });

  it('renders with no data: empty fields, nothing to add yet', () => {
    const html = form();
    expect(html).not.toMatch(/value="\d/);
  });
});
