import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { proteinState } from '../src/domain/proteinState';
import { DrawerHandle, TodayDrawer } from '../src/screens/today/TodayDrawer';

describe('proteinState', () => {
  it('says "Protein closed" when closed', () => expect(proteinState({ gapG: 0, closed: true, dayClosed: false })).toBe('Protein closed'));
  it('says "8 g short" after the day is closed', () => expect(proteinState({ gapG: 8, closed: false, dayClosed: true })).toBe('8 g short'));
  it('says "22 g to go" otherwise', () => expect(proteinState({ gapG: 22, closed: false, dayClosed: false })).toBe('22 g to go'));
});

describe('DrawerHandle', () => {
  it('shows Ready 78, the protein state and Close the day', () => {
    const html = renderToStaticMarkup(<DrawerHandle ready={78} protein="22 g to go" closeLabel="Close the day" onOpen={() => {}} />);
    expect(html).toContain('Ready');
    expect(html).toContain('>78<');
    expect(html).toContain('22 g to go');
    expect(html).toContain('Close the day');
    expect(html).toContain('aria-label="Open today in detail"');
  });
  it('says "—" for readiness without data', () => {
    expect(renderToStaticMarkup(<DrawerHandle ready={undefined} protein="22 g to go" closeLabel="Close the day" onOpen={() => {}} />)).toContain('—');
  });
});

describe('TodayDrawer', () => {
  const noop = () => {};
  it('readiness without sleep shows "—" and "Log sleep", never a made-up score', () => {
    const html = renderToStaticMarkup(<TodayDrawer voice="Quiet day." readiness={{}} protein={{ text: '22 g to go', foods: 'Test yogurt' }} dayClosed={false} onReadiness={noop} onAddGap={noop} onClose={noop} onCloseDay={noop} />);
    expect(html).toContain('—');
    expect(html).toContain('Log sleep');
  });
  it('a closed day offers "Change the closed day"', () => {
    const html = renderToStaticMarkup(<TodayDrawer voice="Quiet day." readiness={{ score: 78, reason: 'Steady' }} protein={{ text: '8 g short', foods: '' }} dayClosed onReadiness={noop} onAddGap={noop} onClose={noop} onCloseDay={noop} />);
    expect(html).toContain('Change the closed day');
    expect(html).toContain('>78<');
  });
});
