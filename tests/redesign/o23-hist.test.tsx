import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EditDay, editKind } from '../../src/screens/settings/DataParts';

describe('o23-hist Edit history', () => {
  it('names the kind of thing changed, with its own colour', () => {
    expect(editKind('entries')).toMatchObject({ word: 'Food' });
    expect(editKind('sets').c).not.toBe(editKind('entries').c);
    expect(editKind('mystery')).toMatchObject({ word: 'Data' });
  });
  it('a day of changes: the date, each change in words with a dot for its kind, and Undo on each', () => {
    let undone = -1;
    const out = html(<EditDay day="2026-03-04" rows={[
      { id: 1, table: 'entries', verb: 'Added', what: 'Porridge', when: '08:10' },
      { id: 2, table: 'sets', verb: 'Changed', what: 'Row', when: '18:00', for: '2026-03-03' },
    ]} onUndo={(id) => { undone = id; }} />);
    expect(out).toContain('Wed 4 Mar');
    expect(out).toContain('Added Porridge');
    expect(out).toContain('Food · 08:10');
    expect(out).toContain('Training · for 3 Mar, 18:00');
    expect(out.match(/>Undo</g)).toHaveLength(2);
    expect(out).toContain('aria-label="Undo: Changed Row"');
    expect(undone).toBe(-1);
  });
});
