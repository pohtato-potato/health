import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BUNDLES } from '../../src/football/ground';
import { BuiltList, GroundHead } from '../../src/screens/football/club/Ground';
import { Kaai } from '../../src/screens/football/club/Kaai';

const stand = BUNDLES.find((b) => b.id === 'kaai-stand')!;

describe('g21 The ground at night', () => {
  it('the head: what is left on the stand, and the built share as text', () => {
    const out = html(<GroundHead focus={stand} st={{ id: 'kaai-stand', progress: { steps: 27, training: 12 } }} built={3} />);
    expect(out).toContain('>3</b>');
    expect(out).toContain('to go on the Kaai Stand');
    expect(out).toContain('Steps 27 of 30');
    expect(out).toContain('Training 12 of 12');
    expect(out).toContain('Kaai Stand · 39 of 42');
    expect(out).toContain('3 built');
  });
  it('with the stand up, the head counts what is built', () => {
    const out = html(<GroundHead built={5} />);
    expect(out).toContain('>5</b>');
    expect(out).toContain('built on the quay');
  });
  it('the stand rises inside its dashed outline to its share', () => {
    const out = html(<Kaai tier={6} done={[]} site share={0.9} />);
    expect(out).toContain('class="kc-rise"');
    expect(out).toContain('--share:0.9');
  });
  it('the built list is numbered, each with what it does', () => {
    const out = html(<BuiltList built={[stand]} shut={() => false} />);
    expect(out).toContain('<ol class="bl21">');
    expect(out).toContain('<b>1</b>');
    expect(out).toContain(stand.effect.slice(0, 20));
  });
});
