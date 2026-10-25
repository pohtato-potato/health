import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STRIDE_M } from '../src/domain/walk';
import { ArrivalView } from '../src/screens/walk/Arrival';
import { arrivalFor } from '../src/walk/arrivals';

const steps = (km: number) => Math.round((km * 1000) / STRIDE_M);

describe('the last beat of an arrival', () => {
  const a = arrivalFor('Agra', new Map([['2026-01-01', steps(240)]]), '2026-01-01')!;
  it('goes back to the walk', () => {
    expect(renderToStaticMarkup(<ArrivalView a={a} beat={5} onNext={() => {}} onSkip={() => {}} />)).toContain('Back to the walk');
  });
  it('at a chapter’s end, says the film comes next', () => {
    const html = renderToStaticMarkup(<ArrivalView a={a} beat={5} ended onNext={() => {}} onSkip={() => {}} />);
    expect(html).toContain('Play the chapter film');
    expect(html).not.toContain('Back to the walk');
  });
});
