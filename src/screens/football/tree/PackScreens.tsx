// Packs and the album (spec §10, §16). Five items a pack, opened on a tap; album cards in the player frames plus
// Legend; duplicates turn into research; a finished set gives its reward. The running-low notice shows once.
import { useGroundShut } from '../../../football/store/around';
import { useState, type CSSProperties } from 'react';
import { ALBUM_CARDS, ALBUM } from '../../../football/content/album';
import { BOOSTS } from '../../../football/content/packs';
import type { Rarity } from '../../../football/content/types';
import { openPackNow, seeRunningLow } from '../../../football/store/treeActions';
import { albumProgress, collected, POOL_WORD, type PoolId } from '../../../football/tree/packs';
import type { PackEarned, PackItem, TreeUser } from '../../../football/tree/types';
import { RUNNING_LOW } from '../../../football/content/words';
import { go } from '../../../router';
import { useModel, type Model } from './model';
import { PackLoan } from '../world/WorldScreens';
import { Gem, GlassCard, SimpleBack, Viewable, type CardView } from '../../../ui/CardViewer';
import type { AlbumCard } from '../../../football/content/types';
import { Action, Door, Doors, Empty, Hero, Panel, Sect } from '../../../ui/kit/Kit';
import { Bar, MarkRow, Note, PanelTop } from '../club/Bits';
import { Icon, type IconName } from '../../../ui/Icon';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { leadsFrom } from '../../../football/market/market';
import { loanLeads } from '../../../football/fog/fog';
import { crestSvg } from '../../../football/art/crest';
import { Art } from '../world/Fog';

const RARITY_NAME: Record<Rarity, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', prism: 'Prism', icon: 'Icon', legend: 'Legend' };
const SOURCE: Record<PackEarned['source'], string> = { 'week-finished': 'A week finished', 'final-won': 'A final won', promotion: 'Promotion', tech: 'From the tree', bounty: 'A bounty', track: 'The season track', testimonial: 'A testimonial', 'cup-final': 'A cup final reached' };
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The running-low notice: once a pool reaches 80–85%, until the pool grows. */
export function RunningLow({ pools }: { pools: PoolId[] }) {
  if (!pools.length) return null;
  const p = pools[0];
  return (
    <Panel ink="#ffad6b">
      <PanelTop name="Running low" c="#ffad6b" />
      <b>{RUNNING_LOW.title.replace('{pool}', POOL_WORD[p])}</b>
      <span className="k-q">{RUNNING_LOW.line.replace('{pool}', POOL_WORD[p])}</span>
      <Action quiet sm onClick={() => void seeRunningLow(p)}>Got it</Action>
    </Panel>
  );
}

const PACK_WORD: Record<PackEarned['size'], string> = { big: 'Big pack', single: 'Album card', normal: 'Pack' };

const RANK: Rarity[] = ['legend', 'icon', 'prism', 'gold', 'silver', 'bronze'];
/** What the packs have brought (board 20, d20-packs): the last eight new album cards fanned out, the rarest in front,
 * the haul in words, a count per rarity, then the sets you have started. */
export function PackHaul({ user }: { user: TreeUser }) {
  const items = user.opened.flatMap((o) => o.items);
  const fresh = items.filter((it) => it.kind === 'album' && !it.duplicate).map((it) => ALBUM_CARDS.find((c) => c.id === it.id)).filter((c): c is AlbumCard => !!c);
  if (!user.opened.length) return null;
  const fan = fresh.slice(-8).sort((a, b) => RANK.indexOf(b.rarity) - RANK.indexOf(a.rarity));
  const boosts = items.filter((it) => it.kind === 'boost').length;
  const first = user.opened.reduce((d, o) => (o.on < d ? o.on : d), user.opened[0].on);
  const counts = RANK.map((r) => [r, fresh.filter((c) => c.rarity === r).length] as const).filter(([, n]) => n > 0);
  const sets = albumProgress(user).filter((x) => x.have > 0).sort((a, b) => b.have / b.of - a.have / a.of);
  // The others spread round the one in front; an odd number lean a half step so none hides straight behind it.
  const mid = (fan.length - 2) / 2 - ((fan.length - 1) % 2 ? 0.5 : 0);
  return (
    <>
      {fan.length > 0 && (
        <div className="fn20" role="img" aria-label={`${fan.length} album cards fanned out${fan.length ? `, ${fan[fan.length - 1].title} in front` : ''}`}>
          {fan.map((c, i) => (
            <div key={c.id} className={`fn20-c${i === fan.length - 1 ? ' top' : ''}`} style={{ '--c': RARITY_HUE[c.rarity], '--a': `${i === fan.length - 1 ? 0 : (i - mid) * 9}deg`, '--d': `${0.2 + i * 0.1}s` } as CSSProperties}>
              <b>{c.title}</b><small>{RARITY_NAME[c.rarity]}</small>
            </div>
          ))}
        </div>
      )}
      <div className="pk20"><b>{user.opened.length} {user.opened.length === 1 ? 'pack' : 'packs'} opened</b><span>{fresh.length} album {fresh.length === 1 ? 'card' : 'cards'} and {boosts} {boosts === 1 ? 'boost' : 'boosts'} since {fmtDate(first)}</span></div>
      {counts.length > 0 && <div className="rk20">{counts.map(([r, n]) => <span key={r} style={{ '--c': RARITY_HUE[r] } as CSSProperties}><i aria-hidden="true" />{n} {RARITY_NAME[r].toLowerCase()}</span>)}</div>}
      {sets.length > 0 && (
        <div className="al20">
          {sets.slice(0, 4).map((x) => (
            <div key={x.set.id}><b>{x.set.title}</b><span>{x.have} of {x.of}</span><Bar pct={(x.have / x.of) * 100} c="#ff9ae8" label={`${x.have} of ${x.of}`} /></div>
          ))}
        </div>
      )}
    </>
  );
}

/** Packs (board two, "Packs"): a pack you can see, and one thing to do. Then the album and the market as doors. */
export function PacksPage() {
  const m = useModel();
  const [showing, setShowing] = useState<string | null>(null);
  const leads = useLiveQuery(async () => { const sv = await db.fbSave.get('save'); return leadsFrom(loanLeads(sv?.desk)).length; }, []);
  // Matchday §4 (d-closed B): after Close the day, packs are held for the morning.
  const shut = useGroundShut() ?? false;
  if (!m) return null;
  const shown = showing ? m.user.opened.find((o) => o.id === showing) : undefined;
  const waiting = m.packsWaiting;
  const first = waiting[0];
  const open = (id: string) => { if (!shut) void openPackNow(id).then(() => setShowing(id)); };
  const crest = crestSvg(m.t.save.crest.step, m.t.save.crest.opt, 70, 'The club crest on the pack');
  const doors = (
    <Doors two label="From packs">
      <Door icon="pack" name="The album" value={`${collected(m.user).size} of ${ALBUM_CARDS.length}`} family="record" onClick={() => go('/football/album')} />
      <Door icon="deal" name="Loan market" value={leads === undefined ? '–' : leads ? `${leads} ${leads === 1 ? 'name' : 'names'}` : 'No names yet'} family="money" onClick={() => go('/football/market')} />
    </Doors>
  );
  return (
    <div className="k-page">
      <RunningLow pools={m.t.low} />
      {shown ? <Reveal items={shown.items} onDone={() => setShowing(null)} /> : first ? (
        <>
          <button type="button" className={`kk-pack ${first.size}`} disabled={shut} onClick={() => open(first.id)} aria-label={shut ? 'A pack, held for the morning' : 'Open the pack'}>
            <Art svg={crest} />
          </button>
          <h2 className="kk-title">{waiting.length === 1 ? `One ${PACK_WORD[first.size].toLowerCase()} to open` : `${waiting.length} packs to open`}</h2>
          <p className="k-q kk-sub">{SOURCE[first.source]}, {fmtDate(first.on)}. {first.size === 'single' ? 'One album card inside.' : 'Five things inside.'}</p>
          {shut ? <Panel ink="#93c3dc"><b>The ground is shut for the night.</b><span className="k-q">Packs wait for the morning parcel.</span></Panel>
            : <Action wide onClick={() => open(first.id)}>Open it</Action>}
          {doors}
          {waiting.length > 1 && (
            <>
              <Sect>Also waiting</Sect>
              <div className="kb-rows">
                {waiting.slice(1).map((p) => (
                  <Panel key={p.id} ink={p.size === 'big' ? '#ffe27a' : p.size === 'single' ? '#93c3dc' : '#f2c46d'} onClick={shut ? undefined : () => open(p.id)} label={`Open: ${PACK_WORD[p.size]}, ${SOURCE[p.source]}`}>
                    <MarkRow icon="pack" c={p.size === 'big' ? '#ffe27a' : p.size === 'single' ? '#93c3dc' : '#f2c46d'} name={`${PACK_WORD[p.size]} · ${SOURCE[p.source]}`} line={`${fmtDate(p.on)} · ${shut ? 'in the morning' : 'tap to open'}`} />
                  </Panel>
                ))}
              </div>
            </>
          )}
          {m.user.opened.length > 0 && <><Sect>From your packs</Sect><PackHaul user={m.user} /></>}
        </>
      ) : (
        <>
          {m.user.opened.length ? <PackHaul user={m.user} /> : <Empty icon="pack" ink="#f2c46d" title="No packs waiting" line="They come from each week you finish, finals won, promotion, the season track and some bounties." />}
          {doors}
        </>
      )}
    </div>
  );
}

/** Five items, one after another, on a tap. */
function Reveal({ items, onDone }: { items: PackItem[]; onDone: () => void }) {
  const [n, setN] = useState(1);
  const all = n >= items.length;
  return (
    <section className="kk-items" aria-live="polite">
      {items.slice(0, n).map((it, i) => <Item key={i} it={it} />)}
      <button type="button" className="k-act wide kb-gold" onClick={() => (all ? onDone() : setN(n + 1))}>{all ? 'Done' : `Next · ${n} of ${items.length}`}</button>
    </section>
  );
}
function Item({ it }: { it: PackItem }) {
  if (it.kind === 'album') {
    const c = ALBUM_CARDS.find((x) => x.id === it.id)!;
    const set = ALBUM.find((s) => s.cards.some((x) => x.id === c.id))!;
    return (
      <Viewable view={() => albumView(c, set.title)} className="k-panel kk-item" style={{ ['--ink' as string]: RARITY_HUE[c.rarity] } as CSSProperties}>
        <PanelTop name={`${RARITY_NAME[c.rarity]} · ${set.title}`} c={RARITY_HUE[c.rarity]} />
        <b className="t">{c.title}</b>
        <span className="k-q">{c.fact}</span>
        {it.duplicate ? <span className="k-q">Already in the album: <b className="k-num" style={{ fontSize: 18 }}>+{it.n}</b> research</span> : <b style={{ color: '#8fdcb6' }}>New in the album</b>}
      </Viewable>
    );
  }
  if (it.kind === 'boost') {
    const b = BOOSTS.find((x) => x.id === it.id)!;
    const kick = b.kind === 'kit-trim' ? 'Kit trim' : 'Boost · one match';
    const view = (): CardView => ({ face: <GlassCard ink="#8fdcb6" tier="silver"><Gem /></GlassCard>, back: <SimpleBack kicker={kick} title={b.name} lines={[b.text]} />, label: `${kick}: ${b.name}` });
    return <Viewable view={view} className="k-panel kk-item" style={{ ['--ink' as string]: '#8fdcb6' } as CSSProperties}><PanelTop name={kick} c="#8fdcb6" /><b className="t">{b.name}</b><span className="k-q">{b.text}</span></Viewable>;
  }
  if (it.kind === 'research') {
    const view = (): CardView => ({ face: <GlassCard ink="#ffe27a" tier="bronze"><Gem /></GlassCard>, back: <SimpleBack kicker="Research" title={`+${it.n}`} lines={['Into the bank.']} />, label: `Research, plus ${it.n}` });
    return <Viewable view={view} className="k-panel kk-item" style={{ ['--ink' as string]: '#c2b2ff' } as CSSProperties}><PanelTop name="Research" c="#c2b2ff" /><b className="k-num" style={{ color: '#c2b2ff' }}>+{it.n}</b><span className="k-q">Into the bank.</span></Viewable>;
  }
  if (it.kind === 'loan' && it.id) return <PackLoan id={it.id} />;
  return null;
}

/** Each set's emblem and colour (board two, "The album"). */
const SET_LOOK: [IconName, string][] = [['ground', '#ff9a76'], ['scope', '#8fdcb6'], ['tree', '#93c3dc'], ['pack', '#f2c46d'], ['desk', '#c2b2ff'], ['sheet', '#f4aedb'], ['map', '#ffd56a'], ['book', '#9fe0e8'], ['win', '#ffb27a'], ['people', '#b9e08a'], ['kit', '#ff7d9c'], ['route', '#d9e8f3']];

/** The album (board two): the count leads, then the sets as tiles with emblem, colour and progress. A tile opens its cards. */
export function AlbumPage() {
  const m = useModel();
  const [open, setOpen] = useState<string | null>(null);
  if (!m) return null;
  const sets = albumProgress(m.user);
  const have = collected(m.user);
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={have.size} ink="#f2c46d" label={`of ${ALBUM_CARDS.length} cards`} />
        <span className="k-r"><span className="k-q">{sets.length} sets</span></span>
      </div>
      <Bar pct={(have.size / Math.max(1, ALBUM_CARDS.length)) * 100} c="#f2c46d" label={`${have.size} of ${ALBUM_CARDS.length} cards`} />
      <RunningLow pools={m.t.low} />
      <div className="kb-g2">
        {sets.flatMap(({ set, have: n, of, done }, i) => {
          const [icon, c] = SET_LOOK[i % SET_LOOK.length];
          const tile = (
            <button key={set.id} type="button" className={`k-panel k-tap ka-set${done ? ' dn' : ''}`} style={{ ['--ink' as string]: c } as CSSProperties} aria-expanded={open === set.id} onClick={() => setOpen(open === set.id ? null : set.id)}>
              <Icon name={done ? 'check' : icon} size={30} color={c} stroke={1.8} />
              <b className="nm">{set.title}</b>
              <Bar pct={(n / of) * 100} c={c} label={`${n} of ${of}`} />
              <span className="k-q">{n} of {of}</span>
            </button>
          );
          if (open !== set.id) return [tile];
          return [tile, (
            <section key={`${set.id}-cards`} className="k-panel ka-open" style={{ ['--ink' as string]: c } as CSSProperties} aria-label={`${set.title}: its cards`}>
              <PanelTop name={set.title} c={c} right={`${n} of ${of}`} />
              <span className="k-q">{set.blurb}</span>
              <span><b>{done ? 'Set reward' : 'Finish it for'}:</b> <span className="k-q">{set.reward.name}</span></span>
              <ol className="ka-cards">
                {set.cards.map((card) => (
                  <li key={card.id} className={have.has(card.id) ? undefined : 'miss'} style={{ ['--r' as string]: RARITY_HUE[card.rarity] } as CSSProperties}>
                    {have.has(card.id) ? (
                      <Viewable view={() => albumView(card, set.title)}>
                        <b>{card.title}</b><span className="k-q kb-small">{RARITY_NAME[card.rarity]}</span>
                        <span>{card.fact}</span>
                      </Viewable>
                    ) : <><b>Not found yet</b><span className="kb-small">{RARITY_NAME[card.rarity]}</span></>}
                  </li>
                ))}
              </ol>
            </section>
          )];
        })}
      </div>
      <Note>Each set has its own colour and emblem. Finishing one gives its prize.</Note>
      <SetRewards m={m} />
    </div>
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
    <>
      <Sect>Set rewards, kept for good</Sect>
      <div className="kb-rows">{done.map((p) => <Panel key={p.set.id} ink="#f2c46d"><b style={{ color: '#f2c46d' }}>{p.set.reward.name}</b><span className="k-q">{p.set.reward.text}</span></Panel>)}</div>
    </>
  );
}
