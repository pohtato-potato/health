import type { ReactNode } from 'react';
import { BlockList, type Blocks } from './BeforeScreen';
import { timeOfDay } from './Frame';

function LookSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="lv-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="lv-sheet-in" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="lv-name" style={{ fontSize: 26 }}>
            {title}
          </h2>
          <button type="button" className="lv-chipbtn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const tagClass = (t: string) => (t === 'record' ? 'gold' : t.startsWith('burn') ? 'burn' : t.endsWith('went well') ? 'ok' : t.endsWith('slipped') || t === 'skipped' ? 'slip' : '');

/** This exercise, set by set: tonight against last time. */
export function SetsLook({ name, rows, note, onClose }: { name: string; rows: { label: string; tonight?: string; last?: string; tags: string[] }[]; note?: string; onClose: () => void }) {
  return (
    <LookSheet title={name} onClose={onClose}>
      <div className="lv-sets-head">
        <span>Set</span>
        <span>Tonight</span>
        <span>Last time</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="lv-sets-row">
          <span>{r.label}</span>
          <span>
            <b className="num tn">{r.tonight ?? '–'}</b>
            {r.tags.map((t) => (
              <span key={t} className={`lv-tag ${tagClass(t)}`}>
                {t}
              </span>
            ))}
          </span>
          <span className="num tn q">{r.last ?? '–'}</span>
        </div>
      ))}
      {note && <p className="lv-small">Note: {note}</p>}
    </LookSheet>
  );
}

/** The whole session: load blocks, how long it usually takes, the set list and Finish. */
export function SessionLook({ blocks, usual, startedAt, onList, onFinish, onClose }: { blocks: Blocks; usual: { min: number; fromHistory: boolean }; startedAt: number; onList: () => void; onFinish: () => void; onClose: () => void }) {
  return (
    <LookSheet title="Tonight" onClose={onClose}>
      <p className="lv-sub">
        {usual.fromHistory ? 'usually' : 'about'} <b>{usual.min} min</b> · finish about <b>{timeOfDay(startedAt + usual.min * 60_000)}</b>
      </p>
      <BlockList blocks={blocks} />
      <button type="button" className="lv-link" onClick={onList}>
        Open the set list
      </button>
      <button type="button" className="lv-ghost" onClick={onFinish}>
        Finish session
      </button>
    </LookSheet>
  );
}
