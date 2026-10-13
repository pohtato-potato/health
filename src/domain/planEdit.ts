import { groupExercises, type ExerciseDef, type SessionDef } from './plan';

/**
 * Plan editor operations. Each takes a session and returns a new one with orders renumbered:
 * groups count 1, 2, 3…, and a superset's members are 2a, 2b.
 */

type Groups = ExerciseDef[][];

function renumber(session: SessionDef, groups: Groups): SessionDef {
  const exercises = groups
    .filter((g) => g.length)
    .flatMap((g, i) => g.map((e, j) => ({ ...e, order: g.length > 1 ? `${i + 1}${String.fromCharCode(97 + j)}` : `${i + 1}` })));
  return { ...session, exercises };
}

const groupsOf = (s: SessionDef): Groups => groupExercises(s.exercises).map((g) => [...g]);

export function addExercise(session: SessionDef, ex: ExerciseDef): SessionDef {
  return renumber(session, [...groupsOf(session), [ex]]);
}

/** Removes an exercise; a superset left with one member becomes a single exercise. */
export function removeExercise(session: SessionDef, id: string): SessionDef {
  const groups = groupsOf(session).map((g) => g.filter((e) => e.id !== id));
  return { ...renumber(session, groups), short: session.short.filter((x) => x !== id) };
}

/** Moves the exercise's whole group (a superset moves together) up or down one place. */
export function moveExercise(session: SessionDef, id: string, by: -1 | 1): SessionDef {
  const groups = groupsOf(session);
  const i = groups.findIndex((g) => g.some((e) => e.id === id));
  const j = i + by;
  if (i < 0 || j < 0 || j >= groups.length) return session;
  [groups[i], groups[j]] = [groups[j], groups[i]];
  return renumber(session, groups);
}

/** Pairs an exercise with the one after it as a superset, or splits its superset into singles. */
export function setSuperset(session: SessionDef, id: string, on: boolean): SessionDef {
  const flat = session.exercises;
  const i = flat.findIndex((e) => e.id === id);
  if (i < 0) return session;
  if (!on) {
    const groups = groupsOf(session).flatMap((g) => (g.some((e) => e.id === id) ? g.map((e) => [e]) : [g]));
    return renumber(session, groups);
  }
  const next = flat[i + 1];
  if (!next) return session;
  const groups = groupsOf(session)
    .map((g) => g.filter((e) => e.id !== id && e.id !== next.id))
    .filter((g) => g.length);
  const before = groupsOf(session).findIndex((g) => g.some((e) => e.id === id));
  const kept = groupsOf(session).slice(0, before).map((g) => g.filter((e) => e.id !== next.id)).filter((g) => g.length).length;
  groups.splice(kept, 0, [flat[i], next]);
  return renumber(session, groups);
}

export function updateExercise(session: SessionDef, id: string, patch: Partial<Omit<ExerciseDef, 'id' | 'order'>>): SessionDef {
  return { ...session, exercises: session.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}
