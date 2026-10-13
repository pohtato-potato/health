import { regionAt, stateAt } from '../domain/regions';
import type { RegionId } from '../ui/light';

export { regionAt, stateAt };

export type TerrainKind = 'plains' | 'desert' | 'ravines' | 'plateau' | 'ghats' | 'coast' | 'delta' | 'hills' | 'pass';

/** The land each region walks over, with a rough height for the map. */
const TERRAIN: Record<RegionId, { kind: TerrainKind; elevationM: number; words: string[] }> = {
  plains: { kind: 'plains', elevationM: 200, words: ['Mustard and wheat on both sides, flat to the horizon.', 'Brick kilns smoking far off across the fields.', 'A canal ran beside the road for most of the day.'] },
  desert: { kind: 'desert', elevationM: 350, words: ['Dunes and khejri trees; the light went gold early.', 'Camels crossed the road without looking.', 'A dry wind, and every step left a mark.'] },
  ravines: { kind: 'ravines', elevationM: 180, words: ['Crossed the Chambal at dusk; the ravines went copper.', 'The land folded into gullies on both sides.', 'Kingfishers over the river, ravines all round.'] },
  deccan: { kind: 'plateau', elevationM: 550, words: ['Black soil and cotton fields across the plateau.', 'Boulder hills, balanced as if placed by hand.', 'Long straight road over the high plateau.'] },
  ghats: { kind: 'ghats', elevationM: 700, words: ['Mist in the ghats; everything dripped and grew.', 'Switchbacks through green hills and waterfalls.', 'Pepper vines on the trees by the road.'] },
  coast: { kind: 'coast', elevationM: 20, words: ['Coconut palms and the smell of the sea.', 'Fishing boats pulled up on the sand.', 'Salt pans shining white by the road.'] },
  east: { kind: 'delta', elevationM: 60, words: ['Paddy fields and ponds, green to the edge.', 'Rivers wide and slow, ferries waiting.', 'Temples rising out of the rice fields.'] },
  northeast: { kind: 'hills', elevationM: 1000, words: ['Tea gardens stepping up the hills.', 'Bamboo forest and cloud at eye level.', 'Rain came and went every hour.'] },
  himalaya: { kind: 'pass', elevationM: 3200, words: ['Snow peaks ahead, thin air, slow steps.', 'Prayer flags snapping on the pass.', 'Deodar forest, then bare rock above it.'] },
};

export function terrainAt(km: number): { kind: TerrainKind; elevationM: number; region: RegionId } {
  const region = regionAt(km);
  return { kind: TERRAIN[region].kind, elevationM: TERRAIN[region].elevationM, region };
}

/** A line about the land, the same one for the same day. */
export function landLine(km: number, seed: number): string {
  const words = TERRAIN[regionAt(km)].words;
  return words[Math.abs(seed) % words.length];
}
