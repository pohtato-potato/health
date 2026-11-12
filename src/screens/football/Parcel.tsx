// The morning parcel (matchday §4, k-parcel, p3-shut, p3-result, p3-scout) and the ground at night (d-closed B,
// p3-night). The parcel has its own dawn look: sealed tiles, each edged in its own colour, opened one at a time.
// The result tile offers Watch or Skip before any score; it calls the match only through `matchGate`.
import { useEffect, useState } from 'react';
import { answerPhysio } from '../../db/actions';
import { PHYSIO_ANSWERS, physioLine, type PhysioAnswer } from '../../domain/treatment';
import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
import { cameIn, forTheMorning, TILE, type TileKind } from '../../football/parcel';
import { holdTalk, openParcel, type Parcel, type TalkOffer } from '../../football/store/around';
import type { Tonight } from '../../football/store/hooks';
import { matchGate, storedGate } from '../../football/store/matchGate';
import { OWN } from '../../football/store/season';
import type { FbSave, PausedMatch, StoredMatch } from '../../football/store/tables';
import { TALK_AGENT, talkTarget, type TalkPick } from '../../football/talks';
import { go } from '../../router';
import { AXIS_INK } from '../../ui/inks';
import '../../styles/matchday.css';
import { DiceTile } from './desk/Desk';

function Art({ svg }: { svg: string }) {
  return <span className="fb-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
// The club's first word reads better than its three-letter code at 360 px, as on Today.
const shortName = (id: string) => { if (id === OWN) return 'Brabo'; const n = clubById(id).name; const w = n.split(' ')[0]; return w.length >= 4 && w.length <= 12 ? w : clubById(id).short || n; };
const nameOf = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);
const crest = (save: FbSave, id: string, size: number) => (id === OWN ? crestSvg(save.crest.step, save.crest.opt, size) : clubCrest(clubById(id), size));
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (d: string) => WEEKDAY[new Date(`${d}T12:00:00`).getDay()];
const fmtN = (n: number) => n.toLocaleString('en-GB');
/** Shown only as a time stamp; nothing in the game reads it. */
const clockAt = (ms: number) => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };

// Where the owner is in the parcel survives a trip to the match screen (Watch) and back.
const KEY = 'health.parcel';
const readAt = (date: string): number => { try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { date: string; at: number } | null; return v?.date === date ? v.at : -1; } catch { return -1; } };
const keepAt = (date: string, at: number) => { try { sessionStorage.setItem(KEY, JSON.stringify({ date, at })); } catch { /* starts sealed next time */ } };

function Sealed({ tiles, small, from = 0 }: { tiles: TileKind[]; small?: boolean; from?: number }) {
  return (
    <>
      {tiles.map((k, i) => (
        <div key={k} className={`md-tile${small ? ' small' : ''}`} style={{ '--ink': TILE[k].ink } as React.CSSProperties}>
          <span className="seal">{from + i + 1}</span><b>{TILE[k].title}</b>{!small && <span className="md-q">sealed</span>}
        </div>
      ))}
    </>
  );
}

/** The parcel, from the sealed view through each tile to the last. */
export function ParcelView({ t, p: live }: { t: Tonight; p: Parcel }) {
  // The tiles stay as they came in while the parcel is open: answering the physio or a talk must not reshuffle them.
  const [fixed] = useState(live);
  const p = { ...fixed, result: live.result ?? fixed.result, waiting: live.waiting };
  const [at, setAt] = useState(() => readAt(t.date));
  useEffect(() => keepAt(t.date, at), [t.date, at]);
  const n = p.tiles.length;
  const next = () => {
    if (at + 1 < n) { setAt(at + 1); window.scrollTo(0, 0); return; }
    void openParcel(t.date);
  };
  if (at < 0) {
    return (
      <main className="md-page dawn">
        <div className="md-in">
          <div className="md-top"><span className="md-cap">{weekday(t.date)} morning</span><span className="md-q">{cameIn(n)}</span></div>
          <h1 className="md-h">The morning parcel</h1>
          <Sealed tiles={p.tiles} />
          <div className="md-fill" />
          <button type="button" className="md-btn" onClick={() => setAt(0)}>Open the first</button>
        </div>
      </main>
    );
  }
  const k = p.tiles[Math.min(at, n - 1)];
  const last = at >= n - 1;
  return (
    <main className="md-page dawn">
      <div className="md-in">
        <div className="md-top">
          <span className="md-cap">{at + 1} of {n} · {TILE[k].title.toLowerCase()}</span>
          <button type="button" className="md-nav-go md-q" onClick={next} style={{ minHeight: 44, minWidth: 64, textAlign: 'right', background: 'none', border: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>{last ? 'Done' : 'Tap to go on'}</button>
        </div>
        {k === 'result' && (p.waiting || p.result) && <ResultTile waiting={p.waiting} m={p.result} save={t.save} onNext={next} last={last} />}
        {k === 'table' && <TableTile date={t.date} onNext={next} last={last} />}
        {k === 'talks' && <TalksTile offers={p.talks} date={t.date} onNext={next} last={last} />}
        {k === 'scout' && <ScoutTile t={t} onNext={next} last={last} />}
        {k === 'academy' && <AcademyTile t={t} onNext={next} last={last} />}
        {k === 'dice' && <DiceTile dice={p.dice} date={t.date} onNext={next} last={last} />}
        {k === 'pack' && <PackTile n={p.packs} date={t.date} onNext={next} last={last} />}
        <div className="md-fill" />
        <Sealed tiles={p.tiles.slice(at + 1, at + 4)} small from={at + 1} />
      </div>
    </main>
  );
}

const Next = ({ onNext, last, label }: { onNext: () => void; last: boolean; label?: string }) => (
  <button type="button" className="md-btn ghost" onClick={onNext}>{label ?? (last ? 'Done' : 'Next')}</button>
);

const WORD = { W: 'won', D: 'drew', L: 'lost' } as const;
/** p3-result with the owner's change (11 Nov): Watch or Skip first, the score only after one of them. */
export function ResultTile({ waiting, m, save, onNext, last }: { waiting?: PausedMatch; m?: StoredMatch; save: FbSave; onNext: () => void; last: boolean }) {
  const [busy, setBusy] = useState(false);
  // Waiting on the save (Fork A's paused match), or finished by the assistant at 4 am and not seen yet.
  if (waiting || !m || storedGate.waiting(m)) {
    const f = waiting ? { home: waiting.prep.home, away: waiting.prep.away, round: waiting.prep.round } : m!;
    const watch = () => (waiting ? matchGate.watch() : storedGate.watch(m!));
    const skip = async () => { setBusy(true); try { if (waiting) await matchGate.skip(); else await storedGate.skip(m!); } finally { setBusy(false); } };
    return (
      <>
        <h2 className="md-h">Last night: {shortName(f.home)} v {shortName(f.away)}</h2>
        <div className="md-tile col" style={{ '--ink': TILE.result.ink } as React.CSSProperties}>
          <div className="md-duel">
            <figure><Art svg={crest(save, f.home, 56)} /><figcaption>{shortName(f.home)}</figcaption></figure>
            <span className="v" aria-hidden="true">v</span>
            <figure><Art svg={crest(save, f.away, 56)} /><figcaption>{shortName(f.away)}</figcaption></figure>
          </div>
          <p className="md-q" style={{ margin: 0, textAlign: 'center' }}>{f.round ?? 'League'}. {waiting ? 'Watch it with your calls, or skip and your assistant makes them.' : 'The line-up was set last night; the score waits for you.'}</p>
        </div>
        <div className="md-btns">
          <button type="button" className="md-btn" disabled={busy} onClick={watch}>Watch</button>
          <button type="button" className="md-btn ghost" disabled={busy} onClick={() => void skip()}>Skip</button>
        </div>
      </>
    );
  }
  const h = m.home === OWN ? m.score : [m.score[1], m.score[0]];
  const opp = m.opp;
  const scorer = m.credits?.find((c) => c.kind === 'goal');
  return (
    <>
      <div className="md-beam" role="img" aria-label={`${nameOf(m.home)} ${h[0]}, ${nameOf(m.away)} ${h[1]}`}><span className="md-big">{h[0]}–{h[1]}</span></div>
      <div className="md-score">
        <span><Art svg={crest(save, m.home, 30)} />{shortName(m.home)} {h[0]}</span>
        <span>{h[1]} {shortName(m.away)}<Art svg={crest(save, m.away, 30)} /></span>
      </div>
      <h2 className="md-h">You {WORD[m.result]} against {nameOf(opp)}.</h2>
      <p style={{ margin: 0 }}>{m.round ?? 'League'}{m.pens ? `, ${m.pens[0]}–${m.pens[1]} on penalties` : ''}{scorer ? `. ${scorer.name} scored.` : '.'}</p>
      <div className="md-btns">
        <button type="button" className="md-btn ghost" onClick={() => go('/football/match', { id: m.id })}>Watch it</button>
        <Next onNext={onNext} last={last} />
      </div>
    </>
  );
}

function TableTile({ date, onNext, last }: { date: string; onNext: () => void; last: boolean }) {
  const [said, setSaid] = useState<{ a: PhysioAnswer; back?: string } | null>(null);
  return (
    <>
      <h2 className="md-h">The physio has one question.</h2>
      <div className="md-tile col" style={{ '--ink': TILE.table.ink } as React.CSSProperties}>
        <p style={{ margin: 0 }}>How are you feeling against yesterday?</p>
        <div className="md-opts" role="group" aria-label="How are you feeling">
          {PHYSIO_ANSWERS.map((o) => (
            <button key={o.id} type="button" aria-pressed={said?.a === o.id} style={{ fontFamily: 'var(--ab)', fontSize: 16 }} disabled={!!said}
              onClick={() => void answerPhysio(date, o.id).then((back) => setSaid({ a: o.id, back }))}>{o.label}</button>
          ))}
        </div>
        {said && <p style={{ margin: 0 }}>{physioLine(said.a, said.back)}</p>}
      </div>
      <p className="md-q">The rotation squad plays tonight, as on every sick day.</p>
      <Next onNext={onNext} last={last} />
    </>
  );
}

function TalksTile({ offers, date, onNext, last }: { offers: TalkOffer[]; date: string; onNext: () => void; last: boolean }) {
  const [done, setDone] = useState<Record<string, number>>({});
  return (
    <>
      <h2 className="md-h">A new season. The agents are in.</h2>
      {offers.map((o) => {
        const a = TALK_AGENT[o.habit];
        const ink = o.habit === 'steps' ? AXIS_INK.Pace : AXIS_INK.Fuel;
        const set = done[o.habit];
        const pick = (p: TalkPick) => void holdTalk(o, p, date).then((to) => setDone((d) => ({ ...d, [o.habit]: to })));
        return (
          <div key={o.habit} className="md-tile col" style={{ '--ink': ink } as React.CSSProperties}>
            <b style={{ color: ink }}>{a.name}</b>
            <p style={{ margin: 0 }}>Over the last six weeks, the middle of your {o.days} logged days was {fmtN(o.ask)} {a.unit}. They ask for that as the target.</p>
            <div className="md-row"><span>Now</span><b className="md-h" style={{ fontSize: 20 }}>{fmtN(o.current)} {a.unit}</b></div>
            {set === undefined ? (
              <div className="md-btns" style={{ flexDirection: 'column' }}>
                <button type="button" className="md-btn" onClick={() => pick('sign')}>Sign · {fmtN(o.ask)}</button>
                <div className="md-btns">
                  <button type="button" className="md-btn ghost" onClick={() => pick('haggle')}>Haggle · {fmtN(talkTarget(o.habit, 'haggle', o.current, o.ask))}</button>
                  <button type="button" className="md-btn ghost" onClick={() => pick('hold')}>Hold</button>
                </div>
              </div>
            ) : <p style={{ margin: 0 }}><b>{set > o.current ? `New target: ${fmtN(set)} ${a.unit}, from today.` : `Held at ${fmtN(set)} ${a.unit}. No change.`}</b></p>}
          </div>
        );
      })}
      <p className="md-q">Targets only ever rise here, and only when you say so.</p>
      <Next onNext={onNext} last={last} />
    </>
  );
}

function ScoutTile({ t, onNext, last }: { t: Tonight; onNext: () => void; last: boolean }) {
  const s = t.morning.scout!;
  const opp = t.fixture?.opp;
  return (
    <>
      <div className="md-tile col" style={{ '--ink': TILE.scout.ink } as React.CSSProperties}>
        {opp && <div className="md-row" style={{ justifyContent: 'flex-start', gap: 12 }}><Art svg={clubCrest(clubById(opp), 48)} /><span><b className="md-h" style={{ fontSize: 22 }}>{nameOf(opp)}</b><br /><span className="md-q">Tonight’s opponent</span></span></div>}
        <div className="md-row"><span>Their strongest</span><b style={{ color: AXIS_INK[s.unit] }}>{s.unit} · {s.key}</b></div>
        {s.weak && <div className="md-row"><span>Weak spot</span><b style={{ color: AXIS_INK[s.weak.unit] }}>{s.weak.unit}</b></div>}
      </div>
      <p style={{ margin: 0 }}>“{s.line}” <span className="md-q">Your scout</span></p>
      {s.weak && <p className="md-q" style={{ margin: 0 }}>{s.weak.line}</p>}
      <Next onNext={onNext} last={last} />
    </>
  );
}

function AcademyTile({ t, onNext, last }: { t: Tonight; onNext: () => void; last: boolean }) {
  return (
    <>
      <h2 className="md-h">The academy grew overnight.</h2>
      {t.morning.grew.map((g) => (
        <div key={g.name} className="md-tile" style={{ '--ink': TILE.academy.ink } as React.CSSProperties}>
          <b>{g.name}</b><span className="md-h" style={{ fontSize: 22, color: TILE.academy.ink }}>+{g.n}</span>
        </div>
      ))}
      <p className="md-q">Kept bedtimes and kept lights-out pledges grow them.</p>
      <div className="md-btns">
        <button type="button" className="md-btn ghost" onClick={() => go('/football/academy')}>The academy</button>
        <Next onNext={onNext} last={last} />
      </div>
    </>
  );
}

function PackTile({ n, date, onNext, last }: { n: number; date: string; onNext: () => void; last: boolean }) {
  return (
    <>
      <div className="md-tile col" style={{ '--ink': TILE.pack.ink, minHeight: 140, justifyContent: 'center', alignItems: 'center' } as React.CSSProperties}>
        <span className="md-big" style={{ color: TILE.pack.ink }}>{n}</span>
        <b style={{ flex: 'none' }}>{n === 1 ? 'pack is waiting' : 'packs are waiting'}</b>
      </div>
      <div className="md-btns">
        <button type="button" className="md-btn" onClick={() => { void openParcel(date).then(() => go('/football/packs')); }}>Open {n === 1 ? 'it' : 'them'}</button>
        <Next onNext={onNext} last={last} />
      </div>
    </>
  );
}

/** p3-night: the ground with its lights off. Only packs and results are held; the rest stays open. */
export function NightGround({ t, packs, sealAt }: { t: Tonight; packs: number; sealAt?: number }) {
  const held = (t.fixture && !t.morning.intl ? 1 : 0) + packs;
  return (
    <section className="md-in" aria-label="The ground at night">
      <div className="md-top"><span className="md-cap">Day closed{sealAt ? ` · ${clockAt(sealAt)}` : ''}</span></div>
      <svg className="md-ground" viewBox="0 0 336 190" role="img" aria-label="The ground at night with its lights off and one window lit">
        <g fill="none" stroke="#3a4460" strokeWidth="2.4" strokeLinejoin="round"><path d="M10 170h316M30 170v-50l60-24h156l60 24v50M90 96v74M246 96v74M60 108v-70M276 108v-70M50 38h20M266 38h20" /><path d="M120 170v-30h96v30" /></g>
        <rect x="150" y="118" width="14" height="12" fill="#f2c46d" /><circle cx="286" cy="26" r="12" fill="none" stroke="#93c3dc" strokeWidth="2" />
      </svg>
      <h1 className="md-h">The ground is shut for the night.</h1>
      <p style={{ margin: 0 }}>The line-up is set{t.opp ? ` for ${t.opp.name}` : ''}. The result, any pack and whatever the scouts find wait for the morning.</p>
      <div className="md-tile" style={{ '--ink': '#3a4460', boxShadow: 'none' } as React.CSSProperties}>
        <span className="seal" style={{ color: '#8fa0c8', borderColor: '#3a4460' }}>{held}</span><b>{forTheMorning(held)}</b><span className="md-q">sealed</span>
      </div>
      <p className="md-q" style={{ margin: 0 }}>The league table, your squad and cup runs stay open. Only what is new is held.</p>
      <div className="md-nav">
        <button type="button" onClick={() => go('/football/league')}>The table</button>
        <button type="button" onClick={() => go('/football/club')}>Your squad</button>
      </div>
      <button type="button" className="md-btn" onClick={() => go('/football/cup')}>Play a cup run</button>
    </section>
  );
}
