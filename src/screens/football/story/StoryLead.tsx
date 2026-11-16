// Look pass L4: Story's own page as drawn (kit-visual-3 "Story"): the season track as the lead, the legend rival in
// a filled panel, and doors to everything else. The rules sit behind the "?" (storyHow).
import { clubCrest } from '../../../football/art/crest';
import { BOUNTIES_PICKED } from '../../../football/content/season';
import type { TrackStep } from '../../../football/content/types';
import { worldOf } from '../../../football/pyramid/shape';
import { clubById } from '../../../football/data/load';
import { howText, MAX_EARNED, rivalList, twistOf, type Rival } from '../../../football/rivals';
import { upsets } from '../../../football/seasonStory';
import { headToHead } from '../../../football/store/league';
import type { StoredMatch } from '../../../football/store/tables';
import { bountiesPicked, trackOf } from '../../../football/tree/season';
import { go } from '../../../router';
import { Door, Doors, FamilyDoors, Panel } from '../../../ui/kit/Kit';
import { useModel } from '../tree/model';
import { Art } from '../Tonight';
import type { Story } from './StoryHome';
import { RunCard, runOf } from '../RunCard';

const GOLD = '#f2c46d', CORAL = '#ff9a76';
/** A big reward on the track: anything but the small album-card marks. */
export const bigStep = (s: TrackStep) => !!s.reward && s.reward.kind !== 'album-card';

/** The legend's name, for the "?" sheet. */
export const legendName = (rivals: Rival[]) => clubById(rivalList(rivals)[0].clubId).name;

/** One rival as a filled panel: crest, how it began, its twist in coral, and the record when asked. */
export function RivalPanel({ r, matches, record }: { r: Rival; matches: StoredMatch[]; record?: boolean }) {
  const c = clubById(r.clubId);
  const tw = twistOf(r);
  const legend = r.how === 'legend';
  const h = record ? headToHead(matches, r.clubId) : undefined;
  return (
    <Panel ink={CORAL} className="lt-rival" label={`${c.name}: the rivalry`} onClick={() => go('/football/rival', { id: r.clubId })}>
      <div className="lt-rhead">
        <Art svg={clubCrest(c, 44)} />
        <span className="k-col">
          <b className="lt-rname">{c.name}</b>
          <span className="k-q">{legend ? `${howText(r).replace(/^The legend: t/, 'T')} Never fades.` : howText(r)}</span>
        </span>
      </div>
      <span className="lt-twist"><b>{tw.name}:</b> {tw.text}</span>
      {h && <span className="k-q">Played {h.meetings.length}: {h.w} won, {h.d} drawn, {h.l} lost</span>}
    </Panel>
  );
}

/** The season track as the page's lead: the count, this stretch of steps, and the next reward. */
function TrackLead({ n, track: TRACK }: { n: number; track: TrackStep[] }) {
  // Two weeks of steps at a time, the stretch you are in.
  const from = Math.max(0, Math.min(Math.floor(n / 14) * 14, TRACK.length - 14));
  const strip = TRACK.slice(from, from + 14);
  const next = TRACK.find((s) => s.step > n && s.reward);
  return (
    <button type="button" className="lt-track" onClick={() => go('/football/track')} aria-label={`Season track: ${n} of ${TRACK.length}. Open the track`}>
      <span className="k-hero-row">
        <span className="k-hero" style={{ ['--ink' as string]: GOLD }}>{n}</span>
        <b className="lt-tof">of {TRACK.length} on the season track</b>
      </span>
      <span className="lt-steps" aria-hidden="true">
        {strip.map((s) => <i key={s.step} className={`${s.step <= n ? 'dn' : ''}${bigStep(s) ? ' rw' : ''}${s.step === n + 1 ? ' now' : ''}`} />)}
      </span>
      <span className="k-q">{next ? `Next reward at step ${next.step}: ${next.label.toLowerCase()}.` : 'Every reward on the track is yours this season.'}</span>
    </button>
  );
}

export function StoryLead({ s }: { s: Story }) {
  const m = useModel();
  const list = rivalList(s.l.save.rivals);
  const picked = m ? bountiesPicked(m.user, m.week).length : 0;
  const ups = upsets(s.all, s.seasons).length;
  const olds = [...s.l.clubs.values()].filter((c) => c.old && !c.old.standIn).length + (s.l.save.retired?.length ?? 0);
  const view = (v: string) => () => go('/football/story', { view: v });
  const run = runOf(s.all);
  return (
    <div className="lt-story">
      {run && <RunCard run={run} />}
      {m && <TrackLead n={m.track} track={trackOf(worldOf(s.l.save))} />}
      <RivalPanel r={list[0]} matches={s.all} />
      <FamilyDoors two label="More of the story" groups={{ record: [
        <Door key="seasons" line icon="book" family="record" name="Seasons" value={`Season ${s.l.save.season}`} onClick={view('seasons')} />,
        <Door key="moments" line icon="pack" family="record" name="Moments" value={`${ups} upsets`} onClick={view('moments')} />,
        <Door key="rivals" line icon="shield" family="record" name="Rivals" value={`${list.length - 1} of ${MAX_EARNED} earned`} onClick={view('rivals')} />,
        <Door key="olds" line icon="kit" family="record" name="Old selves" value={`${olds} met`} onClick={view('olds')} />,
        <Door key="bounties" line icon="list" family="record" name="Bounties" value={`${picked} picked`} count={picked < BOUNTIES_PICKED ? `${BOUNTIES_PICKED - picked} to pick this week` : undefined} onClick={() => go('/football/bounties')} />,
      ] }} />
      <Doors two label="Settings">
        <Door line icon="more" name="Settings" value="Football rules" onClick={view('settings')} />
      </Doors>
    </div>
  );
}
