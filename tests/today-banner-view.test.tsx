import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayBanner } from '../src/screens/today/TodayBanner';

describe('TodayBanner', () => {
  const html = renderToStaticMarkup(<TodayBanner title="No backup for 9 days." sub="One tap keeps your data safe." actions={[{ label: 'Back up', run: () => {} }]} onDismiss={() => {}} />);
  it('shows the title, the line under it and the action', () => {
    expect(html).toContain('No backup for 9 days.');
    expect(html).toContain('One tap keeps your data safe.');
    expect(html).toContain('>Back up<');
  });
  it('offers a dismiss for the rest of the day, labelled in words', () => {
    expect(html).toContain('aria-label="Dismiss for today"');
  });
  it('sits in the banner slot', () => {
    expect(html).toContain('data-section="banner"');
  });
});
