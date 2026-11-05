import { useState, type CSSProperties } from 'react';
import { QUESTIONS, surprise, whatWouldItTake, type BrowseInput } from '../../domain/browse';
import { seeded } from '../../domain/creatures';
import { fmtDayMonth, fmtInt } from '../../domain/format';
import { statDeck } from '../../domain/shakeStats';
import { HUE } from '../../ui/you/palette';

const tint = (c: string) => ({ '--c': c }) as CSSProperties;

export function Browse({ input, km, stride }: { input: BrowseInput; km: number; stride: number }) {
  const [tap, setTap] = useState(0);
  const deck = input.days.length ? statDeck(input) : [];
  const fact = deck.length ? deck[Math.floor(seeded(`know:${input.today}`)() * deck.length)] : undefined;
  const asked = input.settings.youQuestions?.length
    ? QUESTIONS.filter((q) => input.settings.youQuestions!.includes(q.id))
    : QUESTIONS;
  const take = whatWouldItTake(km, input.today, stride);
  const pick = tap ? surprise(`${input.today}:${tap}`, input) : undefined;
  return (
    <>
      {fact && <div className="yu-card yu-tint" style={tint(HUE.sleep)}><b>Did you know</b><span className="yu-q">{fact.text}</span></div>}
      <section className="yu-sec">
        <h2>Your three questions</h2>
        <div className="yu-rows yu-tint" style={tint(HUE.train)}>
          {asked.map((q) => <div key={q.id}><span>{q.label}</span><b>{q.answer(input) ?? 'Not enough yet'}</b></div>)}
        </div>
      </section>
      {take && (
        <div className="yu-card yu-tint" style={tint(HUE.walk)}>
          <b>What would it take</b>
          <span className="yu-q">{take.stop} by {fmtDayMonth(take.by)}: {fmtInt(take.stepsPerDay)} steps a day.</span>
        </div>
      )}
      <button type="button" className="yu-surprise" onClick={() => setTap(tap + 1)}>Surprise me</button>
      {tap > 0 && (
        <div key={tap} className="yu-card yu-card-in">
          <span>{pick?.text ?? 'Not enough logged for a surprise yet. Give it a few days.'}</span>
          {pick?.sub && <span className="yu-q">{pick.sub}</span>}
        </div>
      )}
    </>
  );
}
