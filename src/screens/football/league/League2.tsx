// World 2's League (LG-4, kit-visual-4 "League" and kit-visual-5 "Every division, with fog"): your place as the
// answer, the top four one tap from the full table of 12, the back page, then doors to the atlas, the cups, the
// calendar and every division. Every division is a stepped pyramid of eight with how much of each you have seen;
// a division's table keeps unmet clubs under the hatching, and the one thing to do is send a scout there.
import { leagueMatchdays, seasonLength } from '../../../football/calendar';
import { pairOf } from '../../../football/pyramid/cups';
import { shapeOf, type Division } from '../../../football/pyramid/shape';
import type { League } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { FbNews, StoredMatch } from '../../../football/store/tables';
import type { Tier } from '../../../football/types';
import { go } from '../../../router';
import { Action, Door, FamilyDoors, Panel, Sect } from '../../../ui/kit/Kit';
import { atlasOf } from '../world/Atlas';
import { BackPageCard } from './News';
import { Table } from './Table';
import { CongressDoor } from '../desk/Congress';
import { crestSvg } from '../../../football/art/crest';
import { CrestLadder, LeagueHead } from './LeagueHome';

const S2 = shapeOf({ world: 2 });
const set = (p: Record<string, string | undefined>) => go('/football/league', p, { replace: true });

export const dayLine = (l: League) => (l.save.phase === 'season' ? `Day ${l.save.day} of ${seasonLength(2)}` : 'Between seasons');

/** The League's first page in world 2. */
export function LeagueHome2({ l, n }: { l: League; n?: { news: FbNews[]; matches: StoredMatch[]; today: string } }) {
  const mine = l.season.tierOf[OWN];
  const rows = l.tables[mine] ?? [];
  const pos = rows.findIndex((r) => r.id === OWN) + 1;
  const played = rows.find((r) => r.id === OWN)?.p ?? 0;
  const cupRound = cupWords(l);
  return (
    <>
      <LeagueHead crest={crestSvg(l.save.crest.step, l.save.crest.opt, 76)} pos={pos} division={S2.name(mine)} line={`of ${rows.length} · ${dayLine(l)} · ${played} of ${leagueMatchdays(2)} played`} />
      <CrestLadder rows={rows} own={crestSvg(l.save.crest.step, l.save.crest.opt, 30)} up={mine > 1 ? 2 : 0} down={3} division={S2.name(mine)} />
      <Panel ink={`var(--fb-t${mine})`} onClick={() => set({ view: 'full' })} label={`${S2.name(mine)}: the full table of ${rows.length}`} className="fb-top4">
        <Table tier={mine} rows={rows} world={2} limit={4} waiting={Boolean(l.save.paused)} own={crestSvg(l.save.crest.step, l.save.crest.opt, 30)} />
        <span className="fb-s fb-seeall-line">See all {rows.length}</span>
      </Panel>
      {n && <BackPageCard news={n.news} matches={n.matches} today={n.today} more />}
      <Sect>Around the league</Sect>
      <FamilyDoors two label="Around the league" groups={{ world: [
        <Door key="div" icon="ground" name="Every division" value={`${S2.divisions.length} divisions`} family="world" onClick={() => set({ view: 'divisions' })} />,
        <Door key="atlas" icon="scope" name="The atlas" value={`${atlasOf(l).seen}% seen`} family="world" onClick={() => go('/football/atlas')} />,
        <Door key="cups" icon="pack" name="The cups" value={cupRound} family="world" onClick={() => set({ view: 'cups' })} />,
        <Door key="cal" icon="list" name="Calendar" value={l.save.phase === 'season' ? `Day ${l.save.day}` : 'Break'} family="world" onClick={() => set({ view: 'calendar' })} />,
        <CongressDoor key="congress" save={l.save} />,
      ] }} />
    </>
  );
}

/** Where Brabo's cups stand, in a word: the round it is in, or out. */
function cupWords(l: League): string {
  const b = l.season.bigcup;
  const r = b?.rounds.find((x) => x.ties.some((t) => (t.home === OWN || t.away === OWN) && !t.winner));
  if (r) return r.name;
  if (b?.winner === OWN) return 'Won';
  return b?.rounds.some((x) => x.ties.some((t) => t.home === OWN || t.away === OWN)) ? 'Out' : 'This season';
}

/** The full table of 12, with its cut lines and the level check. */
export function FullTable2({ l }: { l: League }) {
  const mine = l.season.tierOf[OWN];
  const rows = l.tables[mine] ?? [];
  const played = rows.find((r) => r.id === OWN)?.p ?? 0;
  return <Table tier={mine} rows={rows} world={2} form={l.form} waiting={Boolean(l.save.paused)} day={`${dayLine(l)} · ${played} played · points`} own={crestSvg(l.save.crest.step, l.save.crest.opt, 30)} />;
}

/** Every division: the pyramid of eight, the chosen one's table under the fog, and a scout to send. */
export function EveryDivision({ l, tier }: { l: League; tier?: Tier }) {
  const mine = l.season.tierOf[OWN];
  const on = (tier && tier >= 1 && tier <= S2.divisions.length ? tier : mine) as Division;
  const a = atlasOf(l);
  const seen = (d: number) => a.layers.find((x) => x.t === d);
  const layer = seen(on);
  const [pa, pb] = pairOf(mine);
  // Finding 13 (O40): a tap opened the table below the steps while the page jumped to the top, so it looked as if
  // nothing happened. The chosen division's table is brought into view instead.
  const open = (d: number) => { set({ view: 'divisions', tier: String(d) }); requestAnimationFrame(() => document.getElementById('fb-div-table')?.scrollIntoView({ block: 'start' })); };
  return (
    <>
      <p className="k-q" style={{ margin: 0 }}>Tap a division to open its full table.</p>
      <ol className="fb-steps" aria-label="Every division">
        {S2.divisions.map((d, i) => {
          const [lo, hi] = S2.band(d);
          const pct = seen(d)?.seen ?? 0;
          return (
            <li key={d} style={{ '--t': `var(--fb-t${d})`, '--w': `${58 + i * 6}%` } as React.CSSProperties}>
              <button type="button" className={`fb-step${d === on ? ' on' : ''}${d === mine ? ' you' : ''}`} aria-pressed={d === on}
                aria-label={`${S2.name(d)}${d === mine ? ', yours' : ''}: ratings ${lo} to ${hi}, ${pct}% seen`} onClick={() => open(d)}>
                <b>{S2.name(d)}{d === mine ? ' · you' : ''}</b><span>{pct}%</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div id="fb-div-table" style={{ scrollMarginTop: 72 }}>
        <Table tier={on as Tier} rows={l.tables[on as Tier] ?? []} world={2} day={`${on === mine ? 'Your division · ' : ''}ratings ${S2.band(on).join('–')}`} />
      </div>
      <Panel flat>
        <p className="fb-s" style={{ margin: 0 }}>
          {on === mine ? 'Your division. ' : on === pa || on === pb ? 'You meet these clubs in the Pair Cup. ' : ''}
          Tables are always open. A club you haven’t met or scouted keeps its crest under the hatching. Eight divisions of twelve; the clubs abroad wait below Division Eight.
        </p>
      </Panel>
      <Action wide disabled={!layer?.fog} onClick={() => go('/football/desk/job', { id: 'scout', target: `div:${on}` })}>
        {layer?.fog ? `Send a scout to ${S2.name(on)}` : 'Every crest here is known'}
      </Action>
    </>
  );
}
