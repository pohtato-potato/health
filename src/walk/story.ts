import type { RouteRun } from '../domain/types';
import type { RouteDef } from './catalogue';

/** How a book or film route is being walked: with the story, with the story paused, or with places only. */
export function storyState(run: RouteRun, def: Pick<RouteDef, 'book'>): 'story' | 'paused' | 'places' | undefined {
  if (!def.book) return undefined;
  if (run.storyPauseKm !== undefined) return 'paused';
  return run.story ?? 'story';
}

/** The book's chapters you've reached: up to the pause while it's paused, and none with places only. */
export function chaptersShown(run: RouteRun, def: Pick<RouteDef, 'book'>, km: number): { km: number; text: string }[] {
  const state = storyState(run, def);
  if (!def.book || state === 'places') return [];
  return def.book.chapters.filter((c) => (state === 'paused' ? c.km < run.storyPauseKm! : c.km <= km));
}
