// The Club section: the squad first, then deals, money, kits and the ground, one tap apart.
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { tierName } from '../../../football/data/load';
import { loadClub, type Club } from '../../../football/store/club';
import { acceptOffer, equipAbility, keepHabit, pickKit, renewContract, sellHabit, setCaptain, setOwnSponsor, setSponsorStyle, bookMove } from '../../../football/store/save';
import { KitsView } from './Kits';
import { GroundView } from './Ground';
import { DealsView } from './Deals';
import { MoneyView } from './Money';
import { go, useRoute } from '../../../router';
import { PlayerView } from './Player';
import { SquadView } from './Squad';
import { ElevenSection } from '../players/Screens';

export const CLUB_VIEWS = [
  { id: 'squad', label: 'Squad' },
  { id: 'deals', label: 'Deals' },
  { id: 'money', label: 'Money' },
  { id: 'kits', label: 'Kits' },
  { id: 'ground', label: 'Ground' },
] as const;
export type ClubViewId = (typeof CLUB_VIEWS)[number]['id'];

export const useClub = () => useLiveQuery(() => loadClub(), []);

export function ClubView({ c, view }: { c: Club; view: ClubViewId; extra?: Partial<Record<ClubViewId, ReactNode>> }) {
  return (
    <>
      <nav className="fb-subseg five" aria-label="Club">
        {CLUB_VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={view === v.id} className={view === v.id ? 'on' : undefined} onClick={() => go('/football/club', v.id === 'squad' ? undefined : { view: v.id }, { replace: true })}>{v.label}</button>
        ))}
      </nav>
      {view === 'squad' && <ElevenSection />}
      {view === 'squad' && <SquadView c={c} onCaptain={(a) => void setCaptain(a)} onEquip={(id, i) => void equipAbility(id, i)} />}
      {view === 'deals' && <DealsView c={c} act={{ renew: (h) => void renewContract(h, c.today!), keep: (h) => void keepHabit(h, c.today!), sell: (h) => void sellHabit(h) }} />}
      {view === 'money' && <MoneyView c={c} onAccept={(o) => void acceptOffer(o)} onOwn={(n, s) => void setOwnSponsor(n, s)} />}
      {view === 'kits' && <KitsView c={c} act={{ pick: (s, sl, id) => void pickKit(s, sl, id), style: (sp) => void setSponsorStyle(sp) }} />}
      {view === 'ground' && <GroundView c={c} onMove={(on) => void bookMove(on)} />}
    </>
  );
}

export function ClubHome({ extra }: { extra?: (c: Club) => Partial<Record<ClubViewId, ReactNode>> }) {
  const { params } = useRoute();
  const c = useClub();
  if (c === undefined) return null;
  if (c === null) return <p className="fb-s">The club starts once you found it.</p>;
  const v = (params.get('view') ?? 'squad') as ClubViewId;
  return <ClubView c={c} view={CLUB_VIEWS.some((x) => x.id === v) ? v : 'squad'} extra={extra?.(c)} />;
}

export function PlayerRoute({ axis }: { axis: string }) {
  const c = useClub();
  if (!c) return null;
  const m = c.members.find((x) => x.axis === axis);
  if (!m) return <p className="fb-s">No such squad member.</p>;
  return (
    <>
      <button type="button" className="fb-btn sm" onClick={() => go('/football/club', undefined, { replace: true })}>← The squad</button>
      <PlayerView m={m} tierName={tierName(c.tier)} />
    </>
  );
}
