// The kit wall: every season's kits, each with its record and the nights it wore the patch.
import { BRABO_KITS, type KitDef } from '../art/kit';
import { anniversaryKit, CATALOGUE, dataKit, FIRST_KITS, patchFor, weeksOf, type KitSlot } from '../kits';
import type { FbSave, StoredMatch } from './tables';

export interface WallKit { season: number; slot: KitSlot; id: string; name: string; kit: KitDef; collar?: string; record: { W: number; D: number; L: number }; patches: { date: string; text: string; round?: string }[] }

/** The kit def for an id in a season. DATA and ANNIV are drawn from that season's past. */
export function kitFor(id: string, season: number, matches: StoredMatch[]): { kit: KitDef; name: string; collar?: string } | undefined {
  if (id === 'DATA') {
    const d = dataKit(weeksOf(matches.filter((m) => m.season === season - 1)));
    return { ...d, name: 'The data kit' };
  }
  if (id === 'ANNIV') { const k = anniversaryKit(season); return k ? { kit: k, name: 'The anniversary kit' } : undefined; }
  const c = CATALOGUE.find((k) => k.id === id);
  return c ? { kit: c.kit, name: c.name } : undefined;
}

/** Which kit was worn in each slot each season: picked on launch day, else carried over. Season 1 is the founding shirt. */
export function kitsBySeason(save: FbSave, upTo: number): Record<number, Partial<Record<KitSlot, string>>> {
  const out: Record<number, Partial<Record<KitSlot, string>>> = {};
  let cur: Partial<Record<KitSlot, string>> = { home: `FIRST:${save.shirt}`, away: 'A1' };
  for (let s = 1; s <= upTo; s++) {
    for (const k of (save.kits ?? []).filter((x) => x.season === s)) cur = { ...cur, [k.slot]: k.id };
    out[s] = { ...cur };
  }
  return out;
}
const slotFor = (m: StoredMatch, has3: boolean): KitSlot => (m.braboHome ? 'home' : has3 && /Final/.test(m.round ?? '') ? 'third' : 'away');

export function kitWall(save: FbSave, matches: StoredMatch[]): WallKit[] {
  const by = kitsBySeason(save, save.season);
  const out: WallKit[] = [];
  for (const [sStr, slots] of Object.entries(by)) {
    const season = Number(sStr);
    const played = matches.filter((m) => m.season === season);
    for (const [slot, id] of Object.entries(slots) as [KitSlot, string][]) {
      const first = id.startsWith('FIRST:') ? FIRST_KITS[id.slice(6)] ?? BRABO_KITS.A[0] : undefined;
      const def = first ? { kit: first, name: 'The founding shirt' } : kitFor(id, season, matches);
      if (!def) continue;
      const worn = played.filter((m) => slotFor(m, Boolean(slots.third)) === slot);
      const record = { W: 0, D: 0, L: 0 };
      for (const m of worn) record[m.result]++;
      const patches = worn.flatMap((m) => { const p = patchFor(m); return p ? [{ date: m.date, text: p.text, round: m.round }] : []; });
      out.push({ season, slot, id, name: def.name, kit: def.kit, collar: 'collar' in def ? def.collar : undefined, record, patches });
    }
  }
  return out;
}
