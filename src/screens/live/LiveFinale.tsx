import type { CSSProperties } from 'react';
import { pagesFor, trackArt, type FinaleData } from '../../domain/finale';
import { LiveFrame, Primary } from './Frame';

interface Props {
  step: number;
  onStep: (n: number) => void;
  data: FinaleData;
  flags: { id: string; label: string }[];
  /** What ticking a flag does: a swap next session, a question in the morning. */
  flagNotes?: string[];
  picked: string[];
  onPick: (ids: string[]) => void;
  note: string;
  onNote: (t: string) => void;
  /** Saves the session; the pages after flags show what was saved. */
  onSave: () => void;
  saving: boolean;
  onBack: () => void;
  onDiscard: () => void;
  onDone: () => void;
  saver: boolean;
  rings: [string, string, string];
}

const min = (ms: number) => Math.round(ms / 60_000);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const TINT = { flags: 'calm', records: 'records', music: 'music', time: 'time', form: 'form', recap: 'recap', best: 'best' } as const;

/** One ring of the recap, filling to `frac`. */
function Arc({ r, frac, cls, delay = 0 }: { r: number; frac: number; cls: string; delay?: number }) {
  const C = 2 * Math.PI * r;
  return (
    <>
      <circle cx="150" cy="150" r={r} className="ring-track" strokeWidth={12} />
      <circle cx="150" cy="150" r={r} className={`ring-fill ${cls}`} strokeWidth={12} strokeDasharray={C} style={{ ['--c' as string]: String(C), ['--off' as string]: String(C * (1 - frac)), animationDelay: `${delay}s` }} transform="rotate(-90 150 150)" />
    </>
  );
}

/**
 * The finale: joint flags first, then the records with their songs, the soundtrack, where the
 * time went, form, the recap rings with the session's quality, and the best moment last.
 */
export function LiveFinale(p: Props) {
  const d = p.data;
  const pages = pagesFor(d);
  const page = pages[Math.min(p.step, pages.length - 1)];
  const last = p.step >= pages.length - 1;
  const style = { '--ring1': p.rings[0], '--ring2': p.rings[1], '--ring3': p.rings[2] } as CSSProperties;
  const state = page === 'best' ? 'record' : 'calm';
  const total = Math.max(1, d.hour.total);

  return (
    <LiveFrame state={state} saver={p.saver} className={`fs-${TINT[page]}`} style={style} scroll>
      {/* No dots on the flags page: the page count is only known once the session is saved. */}
      {page !== 'flags' && (
        <div className="lv-steps" role="img" aria-label={`Page ${p.step + 1} of ${pages.length}`}>
          {pages.map((x, i) => (
            <i key={x} className={i <= p.step ? 'on' : ''} />
          ))}
        </div>
      )}

      {page === 'flags' && (
        <>
          <h1 className="lv-h1" style={{ marginTop: 18 }}>
            Anything to flag?
          </h1>
          <p className="lv-small">Joint checks first, so nothing gets lost in the celebration.</p>
          {p.flags.length > 0 && (
            <div className="lv-flags">
              {p.flags.map((f) => {
                const on = p.picked.includes(f.id);
                return (
                  <button key={f.id} type="button" className={on ? 'on' : ''} aria-pressed={on} disabled={p.saving} onClick={() => p.onPick(on ? p.picked.filter((x) => x !== f.id) : [...p.picked, f.id])}>
                    {on ? '✓ ' : ''}
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}
          {p.flagNotes && p.flagNotes.length > 0 && <p className="lv-small">{p.flagNotes.join(' ')}</p>}
          <textarea className="lv-note" aria-label="A note on tonight" placeholder="A note on tonight, for you and the coach…" value={p.note} disabled={p.saving} onChange={(e) => p.onNote(e.target.value)} />
          {!p.saving && (
            <div className="row" style={{ gap: 16, justifyContent: 'center' }}>
              <button type="button" className="lv-link" onClick={p.onBack}>
                Back to the session
              </button>
              <button type="button" className="lv-link" style={{ color: 'var(--rose)' }} onClick={p.onDiscard}>
                Discard
              </button>
            </div>
          )}
        </>
      )}

      {page === 'records' && (
        <>
          <div className="lv-kicker gold" style={{ marginTop: 18 }}>
            {d.pages.length} record{d.pages.length === 1 ? '' : 's'} tonight
          </div>
          <div className="lv-recs">
            {d.pages.map((r) => (
              <div key={r.name} className="lv-rec">
                <div className="lv-small">{r.name}</div>
                <div className="lv-bloom num tn" style={{ fontSize: 72 }}>
                  {r.big} <span className="unit">{r.bigLabel.toLowerCase()}</span>
                </div>
                <div className="lv-small">{r.detail}</div>
                {r.previous && <div className="lv-small">{r.previous}</div>}
                {r.next && <div className="lv-small">Next: {r.next}</div>}
                {d.recordSongs[r.name] && (
                  <div className="lv-small">
                    Set to <b>{d.recordSongs[r.name]}</b>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {page === 'music' && (
        <>
          <div className="lv-kicker" style={{ marginTop: 18 }}>
            The soundtrack
          </div>
          <h1 className="lv-h1">
            {d.songs.length} track{d.songs.length === 1 ? '' : 's'}
          </h1>
          <div className="lv-card">
            {d.songs.slice(0, 8).map((t, i) => (
              <div key={`${t.name}${i}`} className="lv-trackrow">
                <i className="art" style={{ background: trackArt(t.name) }} aria-hidden="true" />
                <span className="grow">
                  <span className="num tn q">{i + 1}</span> {t.name}
                </span>
                {t.record && <span className="lv-tag gold">record</span>}
              </div>
            ))}
          </div>
          {d.topArtist && <p className="lv-small">Most played: {d.topArtist}.</p>}
        </>
      )}

      {page === 'time' && (
        <>
          <div className="lv-kicker" style={{ marginTop: 18 }}>
            Where the time went
          </div>
          <h1 className="lv-h1">{min(d.hour.total)} min</h1>
          <div className="lv-hourbar" aria-hidden="true">
            <i className="h-lift" style={{ width: `${(d.hour.lift / total) * 100}%` }} />
            <i className="h-rest" style={{ width: `${(d.hour.rest / total) * 100}%` }} />
            <i className="h-between" style={{ width: `${(d.hour.between / total) * 100}%` }} />
          </div>
          <div className="lv-hour-rows">
            <div>
              <span className="hdot h-lift" />
              Lifting<b className="num tn">{min(d.hour.lift)} min</b>
            </div>
            <div>
              <span className="hdot h-rest" />
              Resting<b className="num tn">{min(d.hour.rest)} min</b>
            </div>
            {d.hour.between > 0 && (
              <div>
                <span className="hdot h-between" />
                Between rest and lifting<b className="num tn">{min(d.hour.between)} min</b>
              </div>
            )}
          </div>
          <p className="lv-small">
            {d.hour.longestRest > 0 ? `Longest rest ${min(d.hour.longestRest)} min. ` : ''}
            {d.usualMin !== undefined &&
              (() => {
                const diff = min(d.hour.total) - d.usualMin;
                return diff === 0 ? `Right on your usual ${d.name}.` : `${Math.abs(diff)} min ${diff < 0 ? 'quicker' : 'longer'} than your usual ${d.name}.`;
              })()}
          </p>
        </>
      )}

      {page === 'form' && (
        <>
          <div className="lv-kicker" style={{ marginTop: 18 }}>
            Form
          </div>
          <h1 className="lv-h1">{d.form.share !== undefined ? `${pct(d.form.share)} went well` : d.formWord}</h1>
          {d.form.rows.length > 0 && (
            <div className="lv-card">
              {d.form.rows.map((r) => (
                <div key={r.text} className="lv-row">
                  <span className="grow">{r.text}</span>
                  {r.ok === r.of ? <span className="lv-tag ok">every set</span> : <span className="lv-tag slip">slipped {r.of - r.ok} of {r.of}</span>}
                </div>
              ))}
            </div>
          )}
          <p className="lv-small">
            {d.form.slip ? `Most common slip: ${d.form.slip.text.toLowerCase()}, ${d.form.slip.times} time${d.form.slip.times === 1 ? '' : 's'}. ` : ''}
            {d.form.sides ?? ''}
          </p>
        </>
      )}

      {page === 'recap' && (
        <>
          <div className="lv-kicker" style={{ marginTop: 18 }}>
            {d.name} · quality {d.quality}
          </div>
          <div className="lv-recap-rings">
            <svg viewBox="0 0 300 300" width="280" height="280" aria-hidden="true">
              <Arc r={132} frac={d.rings.exercises[1] ? d.rings.exercises[0] / d.rings.exercises[1] : 0} cls="r1" />
              {d.rings.inRange[1] > 0 && <Arc r={108} frac={d.rings.inRange[0] / d.rings.inRange[1]} cls="r2" delay={0.25} />}
              {d.rings.checks !== undefined && <Arc r={84} frac={d.rings.checks} cls="r3" delay={0.5} />}
            </svg>
            <div className="lv-recap-in">
              <b className="num tn">{d.quality}</b>
              <span className="lv-small">quality</span>
            </div>
          </div>
          <div className="lv-legend">
            <span className="s">
              {d.rings.exercises[0]} of {d.rings.exercises[1]} exercises
            </span>
            {d.rings.inRange[1] > 0 && (
              <span className="t">
                {d.rings.inRange[0]} of {d.rings.inRange[1]} sets in range
              </span>
            )}
            {d.rings.checks !== undefined && <span className="c">{pct(d.rings.checks)} of form checks went well</span>}
          </div>
          {(d.compare || d.moved) && (
            <p className="lv-small">
              {d.compare}
              {d.compare && d.moved ? ' ' : ''}
              {d.moved}
            </p>
          )}
          <p className="lv-small">
            {d.quality >= 85 ? 'A properly good session.' : d.quality >= 65 ? 'Solid work.' : 'It counts. The next one builds on it.'} Quality counts form, effort against the 1–2 reps-left target, and sets completed.
          </p>
        </>
      )}

      {page === 'best' && d.best && (
        <div className="lv-record-in">
          {!p.saver && (
            <div className="lv-dust" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDuration: `${6 + (i % 5)}s`, animationDelay: `${(i * 0.7) % 5}s` }} />
              ))}
            </div>
          )}
          <div className="lv-kicker gold">Tonight's best</div>
          <div className="lv-bloom num tn" style={{ fontSize: 120 }}>
            {d.best.big}
            <span className="unit">{d.best.bigLabel.toLowerCase()}</span>
          </div>
          <div className="lv-bloom-sub">{d.best.name}</div>
          <div className="lv-small" style={{ textAlign: 'center' }}>
            {d.best.detail}
            {d.recordSongs[d.best.name] && (
              <>
                , set to <b>{d.recordSongs[d.best.name]}</b>
              </>
            )}
            .
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', flex: 'none', paddingBottom: 8 }}>
        {page === 'flags' ? (
          <Primary disabled={p.saving} onClick={p.onSave}>
            {p.saving ? 'Saving…' : `Save · ${p.picked.length ? `Flag ${p.flags.filter((f) => p.picked.includes(f.id)).map((f) => f.label.toLowerCase()).join(', ')}` : 'Nothing to flag'}`}
          </Primary>
        ) : last ? (
          <Primary tone={page === 'best' ? 'gold' : undefined} onClick={p.onDone}>
            Done
          </Primary>
        ) : (
          <Primary tone={page === 'records' ? 'gold' : undefined} onClick={() => p.onStep(p.step + 1)}>
            {pages[p.step + 1] === 'best' ? 'And the best part' : 'Next'}
          </Primary>
        )}
      </div>
    </LiveFrame>
  );
}
