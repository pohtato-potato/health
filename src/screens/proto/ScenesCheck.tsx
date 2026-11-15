import { useRoute } from '../../router';
import type { PartOfDay } from '../../domain/dates';
import { lookOf, THEMES, type ThemeId } from '../../domain/themes';
import { REGIONS, type RegionId } from '../../ui/light';
import { wearSky } from '../../walk/art/festive';
import { Layered } from '../../walk/art/Layered';
import { LANDMARKS } from '../../walk/art/landmarks';

const HOURS: PartOfDay[] = ['dawn', 'day', 'dusk', 'night'];

/**
 * Design check (made-up, nothing read or saved): every region at every hour in layered dusk, at #/proto/scenes.
 * `?theme=monsoon` wears a theme's sky; `?regions=plains,desert` narrows the list; `?band=1` shows Today's banner crop.
 */
export function ScenesCheck() {
  const p = useRoute().params;
  const theme = (p.get('theme') ?? 'dusk') as ThemeId;
  wearSky(THEMES.some((t) => t.id === theme) ? lookOf(theme).sky : undefined);
  const regions = (p.get('regions')?.split(',') ?? [...REGIONS]) as RegionId[];
  const band = p.get('band') === '1';
  const lm = Object.values(LANDMARKS);
  return (
    <div style={{ padding: '10px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#0b1024', color: '#ede6da', fontSize: 14 }}>
      {regions.flatMap((r, ri) =>
        HOURS.map((h) => (
          <figure key={`${r}-${h}`} style={{ margin: 0 }}>
            <div style={{ height: band ? 56 : 108, borderRadius: 12, overflow: 'hidden' }}>
              <Layered region={r} part={h} todayKm={6} stone={!band} view={band ? 'band' : 'full'} landmark={p.get('lm') ? lm.find((l) => l.region === r) ?? lm[ri] : undefined} moon={{ phase: 0.3, full: false, shower: false }} />
            </div>
            <figcaption>{r} · {h}</figcaption>
          </figure>
        )),
      )}
    </div>
  );
}
