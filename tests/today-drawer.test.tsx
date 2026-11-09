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
  it('shows the protein state and the moon Close the day, with no Readiness and no + button', () => {
    const html = renderToStaticMarkup(<DrawerHandle protein="22 g to go" closeLabel="Close the day" onOpen={() => {}} onCloseDay={() => {}} />);
    expect(html).not.toContain('Ready');
    expect(html).toContain('22 g to go');
    expect(html).toContain('Close the day');
    expect(html).toContain('td-moonbtn');
    expect(html).toContain('Open today in detail');
  });
});

describe('TodayDrawer', () => {
  const noop = () => {};
  it('carries the body log where Readiness was', () => {
    const html = renderToStaticMarkup(<TodayDrawer voice="Quiet day." body="All good. Tap where it hurts." protein={{ text: '22 g to go', foods: 'Test yogurt' }} dayClosed={false} onBody={noop} onAddGap={noop} onClose={noop} onCloseDay={noop} />);
    expect(html).toContain('Body log');
    expect(html).not.toContain('Ready');
  });
  it('a closed day offers "Change the closed day"', () => {
    const html = renderToStaticMarkup(<TodayDrawer voice="Quiet day." body="Knees: sore" protein={{ text: '8 g short', foods: '' }} dayClosed onBody={noop} onAddGap={noop} onClose={noop} onCloseDay={noop} />);
    expect(html).toContain('Change the closed day');
    expect(html).toContain('Knees: sore');
  });
});
