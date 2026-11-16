import { useBody, useToday } from '../db/hooks';
import { bodyTileWords, labelFor, kindOf, WHOLE_BODY } from '../domain/bodyLog';
import { addBodyEntry, deleteBodyEntry } from '../db/actions';
import { addDays } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { back, go } from '../router';
import { BodyChart } from '../ui/BodyChart';
import type { CSSProperties } from 'react';
import { Door, Doors, PageHead, Sect, Title, type HowThisWorks } from '../ui/kit/Kit';

const HOW: HowThisWorks = {
  title: 'The body log',
  steps: [
    { icon: 'body', ink: '#f4aedb', head: 'Tap where it hurts', line: 'Then pick what kind. Nothing tapped means all good.' },
    { icon: 'joint', ink: '#93c3dc', head: 'The whole body', line: 'Tired, sore all over and the like, as switches.' },
    { icon: 'train', ink: '#ff9a76', head: 'Train adds its notes', line: 'A mark made during a set shows here with its exercise.' },
    { icon: 'shield', ink: '#8fdcb6', head: 'Never the match', line: 'For the coach and your own record. It never touches Football.' },
  ],
};

/** The body log page (replaces Readiness): today's chart, then the last fortnight's marks, including Train's in-set notes. */
export function BodyLogPage() {
  const today = useToday();
  const body = useBody();
  if (!body) return <div className="page bare k-page k-light you" />;
  const words = bodyTileWords(body, today);
  const marked = words.startsWith('All good') ? '' : words;
  const recent = body.filter((e) => e.date < today && e.date >= addDays(today, -14)).sort((a, b) => b.at - a.at);
  return (
    <div className="page bare k-page k-light you bl-page">
      <PageHead back="Today" onBack={() => back('/today')} title="Body log" help={HOW} family="body" />
      <Title under={marked ? <b style={{ color: '#f4aedb' }}>Today: {marked}</b> : 'Tap where it hurts, then what kind.'}>How’s the body?</Title>
      <BodyChart date={today} entries={body} />
      <Sect>The whole body</Sect>
      <div className="k-pills" role="group" aria-label="Whole body">
        {WHOLE_BODY.map((w) => {
          const on = body.find((e) => e.date === today && e.part === w.part && e.kind === 'felt');
          return (
            <button key={w.part} type="button" role="switch" aria-checked={!!on} aria-pressed={!!on} className="k-pill" onClick={() => void (on ? deleteBodyEntry(on.id) : addBodyEntry({ part: w.part, kind: 'felt', date: today }))}>
              {w.label}
            </button>
          );
        })}
      </div>
      {recent.length > 0 && (
        <>
          <Sect>The last two weeks</Sect>
          <div className="k-panel k-rows" style={{ '--ink': '#f4aedb' } as CSSProperties}>
            {recent.map((e) => (
              <div key={e.id} className="k-rowl" style={{ flexWrap: 'wrap', padding: '8px 0' }}>
                <span>{fmtDayMonth(e.date)}</span>
                <b style={{ color: kindOf(e.kind).ink }}>{labelFor(e.part)}{e.side && e.side !== 'both' ? ` (${e.side})` : ''}{e.kind === 'felt' ? '' : ` · ${kindOf(e.kind).label}`}</b>
                {e.exercise && <span className="k-q" style={{ flexBasis: '100%' }}>During {e.exercise}{e.setNo ? `, set ${e.setNo}` : ''}</span>}
              </div>
            ))}
          </div>
        </>
      )}
      {/* Ledger O40: Photos and the physio summary were three taps from any tab; from here they are two. */}
      <Sect>More of the body</Sect>
      <Doors two label="More of the body">
        <Door line icon="camera" name="Photos" value="Check-in pictures" family="body" onClick={() => go('/photos')} />
        <Door line icon="joint" name="For your physio" value="A summary to show" family="body" onClick={() => go('/physio')} />
      </Doors>
    </div>
  );
}
