import { db } from '../db/db';
import type { Settings, SongRecord, TrainingSession } from '../domain/types';

/*
 * Last.fm: what was playing during a session. Read by username with the owner's own API key,
 * both from the private starter file; the key never ships in the code. Online only.
 */
const API = 'https://ws.audioscrobbler.com/2.0/';
const recentUrl = (user: string, key: string, from: number, to: number) =>
  `${API}?${new URLSearchParams({ method: 'user.getrecenttracks', user, api_key: key, from: String(from), to: String(to), limit: '200', format: 'json' })}`;

type Track = { artist?: { '#text'?: string } | string; name?: string; date?: { uts?: string }; '@attr'?: { nowplaying?: string } };
const artistOf = (t: Track) => (typeof t.artist === 'string' ? t.artist : t.artist?.['#text'] ?? '');

/** Every play in the window with its time, leaving out the track playing right now (it has no time yet). */
export function parseRecent(v: unknown): { artist: string; track: string; at: number }[] {
  const raw = (v as { recenttracks?: { track?: unknown } })?.recenttracks?.track;
  const tracks: Track[] = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw as Track] : [];
  return tracks
    .filter((t) => t['@attr']?.nowplaying !== 'true' && t.name && artistOf(t) && t.date?.uts)
    .map((t) => ({ artist: artistOf(t), track: t.name!, at: Number(t.date!.uts) * 1000 }));
}

/**
 * The session's soundtrack, cached in the songs table once fetched. Offline or failing, it
 * returns nothing and caches nothing, so the next open tries again.
 */
/** What played between two moments, straight from Last.fm, kept nowhere: for the record moment mid-session. */
export async function fetchRecent(settings: Pick<Settings, 'lastfm'>, from: number, to: number, fetchFn: typeof fetch = fetch): Promise<{ artist: string; track: string; at: number }[]> {
  const lf = settings.lastfm;
  if (!lf?.key || !lf.users.length) return [];
  try {
    const res = await fetchFn(recentUrl(lf.users[0], lf.key, Math.floor(from / 1000), Math.ceil(to / 1000)));
    return res.ok ? parseRecent(await res.json()) : [];
  } catch {
    return [];
  }
}

export async function fetchSessionTracks(session: Pick<TrainingSession, 'id' | 'startedAt' | 'endedAt'>, settings: Pick<Settings, 'lastfm'>, fetchFn: typeof fetch = fetch): Promise<SongRecord[]> {
  const cached = await db.songs.where('id').startsWith(`${session.id}:`).toArray();
  if (cached.length) return cached.sort((a, b) => a.at - b.at);
  const lf = settings.lastfm;
  if (!lf?.key || !lf.users.length) return [];
  const to = session.endedAt ?? Date.now();
  try {
    const res = await fetchFn(recentUrl(lf.users[0], lf.key, Math.floor(session.startedAt / 1000), Math.ceil(to / 1000)));
    if (!res.ok) return [];
    const plays = parseRecent(await res.json());
    const songs = plays.map((p, i) => ({ id: `${session.id}:${i}`, ...p }));
    if (songs.length) await db.songs.bulkPut(songs);
    return songs.sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

/** A track counts as playing for six minutes after it started. */
const TRACK_MS = 6 * 60_000;

/** What was playing at a moment: the last track to start before it, if it was still on. */
export function songAt(at: number, songs: Pick<SongRecord, 'at' | 'artist' | 'track'>[]): Pick<SongRecord, 'artist' | 'track'> | undefined {
  const before = songs.filter((s) => s.at <= at).sort((a, b) => b.at - a.at)[0];
  return before && at - before.at <= TRACK_MS ? before : undefined;
}

/** Artists most played while training, most first. */
export function topWorkoutArtists(songs: Pick<SongRecord, 'artist'>[]): { artist: string; plays: number }[] {
  const counts = new Map<string, number>();
  for (const s of songs) counts.set(s.artist, (counts.get(s.artist) ?? 0) + 1);
  return [...counts.entries()].map(([artist, plays]) => ({ artist, plays })).sort((a, b) => b.plays - a.plays || a.artist.localeCompare(b.artist));
}
