import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useAllSets, useAllSetsWithSkips, useSessions, useSettings } from '../../db/hooks';
import { RINGS } from '../../domain/liveLook';
import { sessionQuality } from '../../domain/sessionQuality';
import { withTrip } from '../../domain/trip';
import { findSession } from '../../domain/plan';
import { usualLength } from '../../domain/sessionEdges';
import { go, useRoute } from '../../router';
import { useLiveTheme } from '../../ui/live/useLiveTheme';
import { finaleExtras, recordLines, recordPages } from '../SessionDone';
import { finaleData } from './finaleData';
import { LiveFinale } from './LiveFinale';

/** A past session's finale again, from its records page on. */
export function Replay() {
  const { params } = useRoute();
  const id = params.get('id') ?? '';
  const settings = useSettings();
  const sessions = useSessions();
  const sets = useAllSets();
  const withSkips = useAllSetsWithSkips();
  const songs = useLiveQuery(() => db.songs.where('id').startsWith(`${id}:`).toArray(), [id]);
  const theme = useLiveTheme(settings);
  const [step, setStep] = useState(1);
  if (!settings?.plan || !sessions || !sets || !withSkips || !songs) return <div className="page bare" />;
  const session = sessions.find((s) => s.id === id && s.status === 'done');
  if (!session) {
    return (
      <div className="page bare">
        <div className="t15 q">That session isn't here any more.</div>
        <button type="button" className="btn" onClick={() => go('/train', undefined, { replace: true })}>
          Go to Train
        </button>
      </div>
    );
  }
  const plan = withTrip(settings.plan);
  // Its usual length from the sessions before it, as the finale said on the night.
  const usual = usualLength(sessions.filter((s) => s.startedAt < session.startedAt), sets, session.session, findSession(plan, session.session)?.minutes ?? 60);
  const mine = withSkips.filter((s) => s.sessionId === id);
  const kept = sets.filter((s) => s.sessionId === id);
  const data = {
    ...finaleData({
      session,
      mine,
      songs: [...songs].sort((a, b) => a.at - b.at),
      pages: recordLines(kept).length ? recordPages(kept, sets, plan, settings, session.date) : [],
      plan,
      quality: session.quality ?? sessionQuality(mine),
      usualMin: usual.fromHistory ? usual.min : undefined,
    }),
    ...finaleExtras(session, session.context ?? [], sessions, sets, plan),
  };
  const done = () => go('/train', undefined, { replace: true });
  return (
    <LiveFinale
      step={step}
      onStep={setStep}
      data={data}
      flags={[]}
      picked={[]}
      onPick={() => {}}
      note=""
      onNote={() => {}}
      onSave={() => setStep(1)}
      saving={false}
      onBack={done}
      onDiscard={done}
      onDone={done}
      rings={RINGS[theme]}
    />
  );
}
