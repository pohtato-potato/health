import type { DayKey } from '../domain/dates';
import { decodeBridgeStream, isObject, timestamp } from './bridgeFile';

export interface BridgeMeal {
  id: string;
  providerId: string;
  source: string;
  day: DayKey;
  loggedAt: string;
  sampleIds: string[];
  kcal?: number;
  nutrients: Record<string, number>;
  fileDate: DayKey;
  readAt: number;
}

const number = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function decodeBridgeMealFile(text: string) {
  const { rows, ...read } = decodeBridgeStream(text, 'meals');
  const meals = rows.map((row): BridgeMeal => {
    if (!isObject(row) || !nonempty(row.id) || !nonempty(row.source) || typeof row.at !== 'string' ||
      !Array.isArray(row.uuids) || !row.uuids.length || !row.uuids.every(nonempty)) {
      throw new Error('The Bridge day file has an invalid meal record.');
    }
    const at = timestamp(row.at);
    if (!at) throw new Error('The Bridge meal has an invalid logged time.');
    const kcal = row.kcal;
    if (kcal !== undefined && !number(kcal)) throw new Error('The Bridge meal has an invalid energy value.');
    if (!isObject(row.nutrients)) throw new Error('The Bridge meal is missing its nutrient data.');
    const nutrients: Record<string, number> = {};
    for (const key of Object.keys(row.nutrients).sort()) {
      const value = row.nutrients[key];
      if (!/^[a-z][a-z0-9_]*_(?:g|mg|mcg|ml|kcal)$/.test(key) || !number(value)) {
        throw new Error('The Bridge meal has an invalid nutrient.');
      }
      nutrients[key] = value;
    }
    return {
      id: JSON.stringify([row.source, row.id]),
      providerId: row.id,
      source: row.source,
      day: at.localDate,
      loggedAt: row.at,
      sampleIds: Array.from(new Set<string>(row.uuids)).sort(),
      kcal,
      nutrients,
      fileDate: read.date,
      readAt: read.readAt,
    };
  });
  return { ...read, meals };
}
