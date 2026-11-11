// Packs and the album (spec §10, §16). Five items a pack, opened on a tap; album cards in the player frames plus
// Legend; duplicates turn into research; a finished set gives its reward. The running-low notice shows once.
import { useGroundShut } from '../../../football/store/around';
import { useState, type CSSProperties } from 'react';
import { ALBUM_CARDS, ALBUM } from '../../../football/content/album';
import { BOOSTS } from '../../../football/content/packs';
import type { Rarity } from '../../../football/content/types';
import { openPackNow, seeRunningLow } from '../../../football/store/treeActions';
import { albumProgress, collected, POOL_WORD, type PoolId } from '../../../football/tree/packs';
import type { PackEarned, PackItem } from '../../../football/tree/types';
import { RUNNING_LOW } from '../../../football/content/words';
import { go } from '../../../router';
import { useModel, type Model } from './model';
import { Back, TreePage } from './TreeScreens';
import { PackLoan } from '../world/WorldScreens';
import { Gem, GlassCard, SimpleBack, Viewable, type CardView } from '../../../ui/CardViewer';
import type { AlbumCard } from '../../../football/content/types';

const RARITY_NAME: Record<Rarity, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', prism: 'Prism', icon: 'Icon', legend: 'Legend' };
const SOURCE: Record<PackEarned['source'], string> = { 'week-finished': 'A week finished', 'final-won': 'A final won', promotion: 'Promotion', tech: 'From the tree', bounty: 'A bounty', track: 'The season track', testimonial: 'A testimonial', 'cup-final': 'A cup final reached' };
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The running-low notice: once a pool reaches 80–85%, until the pool grows. */
export function RunningLow({ pools }: { pools: PoolId[] }) {
  if (!pools.length) return null;
  const p = pools[0];
  return (
    <section className="fbt-card low" role="status">
      <span className="fbt-lb">Running low</span>
      <b className="fbt-t2">{RUNNING_LOW.title.replace('{pool}', POOL_WORD[p])}</b>
      <span>{RUNNING_LOW.line.replace('{pool}', POOL_WORD[p])}</span>
      <button type="button" className="fbt-btn sm" onClick={() => void seeRunningLow(p)}>Got it</button>
    </section>
  );
}

export function PacksPage() {
  const m = useModel();
  const [showing, setShowing] = useState<string | null>(null);
  // Matchday §4 (d-closed B): after Close the day, packs are held for the morning.
  const shut = useGroundShut() ?? false;
  if (!m) return null;
  const shown = showing ? m.user.opened.find((o) => o.id === showing) : undefined;
  return (
    <TreePage>
      <Back to="/football/club" params={{ view: 'tree' }} label="The tree" />
      <div className="fbt-head"><h1 className="fbt-t1">Packs</h1><span className="fbt-cap"><b className="fbt-n">{m.packsWaiting.length}</b> to open</span></div>
      <RunningLow pools={m.t.low} />
      {shown ? <Reveal items={shown.items} onDone={() => setShowing(null)} /> : (
        <>
          {shut && m.packsWaiting.length > 0 && <p className="fbt-line"><b>The ground is shut for the night.</b> Packs wait for the morning parcel.</p>}
          {m.packsWaiting.length === 0 && <p className="fbt-line">No packs waiting. They come from each week you finish, finals won, promotion, the season track and some bounties.</p>}
          <div className="fbt-packs">
            {m.packsWaiting.map((p) => (
              <button key={p.id} type="button" className={`fbt-pack ${p.size}`} disabled={shut} onClick={() => { if (!shut) void openPackNow(p.id).then(() => setShowing(p.id)); }}>
                <span className="fbt-lb">{p.size === 'big' ? 'Big pack' : p.size === 'single' ? 'Album card' : 'Pack'}</span>
                <b>{SOURCE[p.source]}</b><small>{fmtDate(p.on)} · {shut ? 'in the morning' : 'tap to open'}</small>
              </button>
            ))}
          </div>
        </>
      )}
      <button type="button" className="fbt-btn wide" onClick={() => go('/football/album')}>The album · {collected(m.user).size} of {ALBUM_CARDS.length}</button>
      <p className="fbt-line">Packs never hold players: your cards are your habits. Each duplicate album card becomes research, from 1 for Bronze to 10 for Icon and 15 for Legend.</p>
    </TreePage>
  );
}

/** Five items, one after another, on a tap. */
function Reveal({ items, onDone }: { items: PackItem[]; onDone: () => void }) {
  const [n, setN] = useState(1);
  const all = n >= items.length;
  return (
    <section className="fbt-reveal" aria-live="polite">
      <div className="fbt-items">
        {items.slice(0, n).map((it, i) => <Item key={i} it={it} />)}
      </div>
      <button type="button" className="fbt-btn gold wide" onClick={() => (all ? onDone() : setN(n + 1))}>{all ? 'Done' : `Next · ${n} of ${items.length}`}</button>
    </section>
  );
}
function Item({ it }: { it: PackItem }) {
  if (it.kind === 'album') {
    const c = ALBUM_CARDS.find((x) => x.id === it.id)!;
    const set = ALBUM.find((s) => s.cards.some((x) => x.id === c.id))!;
    return (
      <Viewable view={() => albumView(c, set.title)} className={`fbt-item album ${c.rarity}${it.duplicate ? ' dup' : ''}`}>
        <span className="fbt-lb">{RARITY_NAME[c.rarity]} · {set.title}</span>
        <b className="fbt-t2">{c.title}</b>
        <span>{c.fact}</span>
        {it.duplicate ? <small>Already in the album: <b className="fbt-n">+{it.n}</b> research</small> : <small>New in the album</small>}
      </Viewable>
    );
  }
  if (it.kind === 'boost') {
    const b = BOOSTS.find((x) => x.id === it.id)!;
    const kick = b.kind === 'kit-trim' ? 'Kit trim' : 'Boost · one match';
    const view = (): CardView => ({ face: <GlassCard ink="#8fdcb6" tier="silver"><Gem /></GlassCard>, back: <SimpleBack kicker={kick} title={b.name} lines={[b.text]} />, label: `${kick}: ${b.name}` });
    return <Viewable view={view} className="fbt-item boost"><span className="fbt-lb">{kick}</span><b className="fbt-t2">{b.name}</b><span>{b.text}</span></Viewable>;
  }
  if (it.kind === 'research') {
    const view = (): CardView => ({ face: <GlassCard ink="#ffe27a" tier="bronze"><Gem /></GlassCard>, back: <SimpleBack kicker="Research" title={`+${it.n}`} lines={['Into the bank.']} />, label: `Research, plus ${it.n}` });
    return <Viewable view={view} className="fbt-item research"><span className="fbt-lb">Research</span><b className="fbt-t2 fbt-n">+{it.n}</b><span>Into the bank.</span></Viewable>;
  }
  if (it.kind === 'loan' && it.id) return <PackLoan id={it.id} />;
  return null;
}

export function AlbumPage() {
  const m = useModel();
  const [open, setOpen] = useState<string | null>(null);
  if (!m) return null;
  const sets = albumProgress(m.user);
  const have = collected(m.user);
  return (
    <TreePage>
      <Back to="/football/packs" label="Packs" />
      <div className="fbt-head"><h1 className="fbt-t1">The album</h1><span className="fbt-cap"><b className="fbt-n">{have.size}</b> of {ALBUM_CARDS.length}</span></div>
      <RunningLow pools={m.t.low} />
      <div className="fbt-sets">
        {sets.map(({ set, have: n, of, done }) => (
          <section key={set.id} className={`fbt-set${done ? ' dn' : ''}`}>
            <button type="button" className="fbt-seth" aria-expanded={open === set.id} onClick={() => setOpen(open === set.id ? null : set.id)}>
              <b>{done ? '✓ ' : ''}{set.title}</b><small>{set.blurb}</small>
              <span className="fbt-bar" role="img" aria-label={`${n} of ${of}`}><i style={{ width: `${Math.round((n / of) * 100)}%` }} /></span>
              <small><b className="fbt-n">{n}</b> of {of} · {done ? 'Set reward' : 'Finish it for'}: {set.reward.name}</small>
            </button>
            {open === set.id && (
              <ol className="fbt-cards">
                {set.cards.map((c) => (
                  <li key={c.id} className={`${c.rarity}${have.has(c.id) ? '' : ' miss'}`} style={{ ['--r' as string]: RARITY_HUE[c.rarity] } as CSSProperties}>
                    {have.has(c.id) ? (
                      <Viewable view={() => albumView(c, set.title)}>
                        <b>{c.title}</b><small>{RARITY_NAME[c.rarity]}</small>
                        <span>{c.fact}</span>
                      </Viewable>
                    ) : <><b>Not found yet</b><small>{RARITY_NAME[c.rarity]}</small></>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
      <SetRewards m={m} />
    </TreePage>
  );
}
const RARITY_HUE: Record<Rarity, string> = { bronze: '#e0955a', silver: '#d6e8f5', gold: '#ffcf4a', prism: '#ff7ad9', icon: '#ffa25c', legend: '#ffd56a' };
/** An album card full screen: glass in its rarity's colour, no words on the face; the fact and the set on the back. */
export function albumView(c: AlbumCard, setTitle: string): CardView {
  return {
    face: <GlassCard ink={RARITY_HUE[c.rarity]} tier={c.rarity}><Gem /></GlassCard>,
    back: <SimpleBack kicker={`${RARITY_NAME[c.rarity]} · ${setTitle}`} title={c.title} lines={[c.fact]} />,
    label: `${c.title}, ${RARITY_NAME[c.rarity]} album card`,
  };
}
function SetRewards({ m }: { m: Model }) {
  const done = albumProgress(m.user).filter((p) => p.done);
  if (!done.length) return null;
  return (
    <section className="fbt-card" aria-label="Set rewards">
      <span className="fbt-lb">Set rewards, kept for good</span>
      {done.map((p) => <p key={p.set.id}><b>{p.set.reward.name}</b> · {p.set.reward.text}</p>)}
    </section>
  );
}
