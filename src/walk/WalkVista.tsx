import type { Festive } from './art/festive';
import { WalkScene } from './WalkScene';

/** The Walk tab's scene at full size (kept under its old name for the pages that draw it). */
export function WalkVista({ km, todayKm = 0, festive }: { km: number; todayKm?: number; festive?: Festive }) {
  return <WalkScene km={km} todayKm={todayKm} festive={festive} />;
}
