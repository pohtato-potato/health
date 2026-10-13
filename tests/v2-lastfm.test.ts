import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, HealthDB, setDatabase } from '../src/db/db';
import { fetchSessionTracks, parseRecent, songAt, topWorkoutArtists } from '../src/sources/lastfm';
import type { Settings, SongRecord, TrainingSession } from '../src/domain/types';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`v2l-${++n}`));
  await db.open();
});

const body = {
  recenttracks: {
    track: [
      { artist: { '#text': 'Now Artist' }, name: 'Playing now', '@attr': { nowplaying: 'true' } },
      { artist: { '#text': 'The Weeknd' }, name: 'Blinding Lights', date: { uts: '1791850200' } },
      { artist: { '#text': 'Daft Punk' }, name: 'Harder, Better, Faster, Stronger', date: { uts: '1791850000' } },
    ],
  },
};
const settings = { lastfm: { key: 'k', users: ['me'] } } as unknown as Settings;
const session = { id: 's1', startedAt: 1791849900000, endedAt: 1791853500000 } as TrainingSession;

describe('Last.fm', () => {
  it('parses plays with their times, leaving out the one playing now', () => {
    expect(parseRecent(body)).toEqual([
      { artist: 'The Weeknd', track: 'Blinding Lights', at: 1791850200000 },
      { artist: 'Daft Punk', track: 'Harder, Better, Faster, Stronger', at: 1791850000000 },
    ]);
    expect(parseRecent({})).toEqual([]);
  });

  it('caches a session’s tracks, and retries after being offline', async () => {
    let calls = 0;
    const offline = async () => {
      calls++;
      throw new Error('offline');
    };
    expect(await fetchSessionTracks(session, settings, offline as typeof fetch)).toEqual([]);
    expect(await db.songs.count()).toBe(0);
    const ok = (async () => {
      calls++;
      return new Response(JSON.stringify(body));
    }) as typeof fetch;
    expect(await fetchSessionTracks(session, settings, ok)).toHaveLength(2);
    expect(await db.songs.count()).toBe(2);
    expect(await fetchSessionTracks(session, settings, ok)).toHaveLength(2);
    expect(calls).toBe(2);
  });

  it('no key, no network call', async () => {
    let called = false;
    const spy = (async () => ((called = true), new Response('{}'))) as typeof fetch;
    expect(await fetchSessionTracks(session, {} as Settings, spy)).toEqual([]);
    expect(called).toBe(false);
  });

  it('what was playing at a moment, and the month’s workout artists', () => {
    const songs: SongRecord[] = [
      { id: 'a', at: 1000_000, artist: 'A', track: 'one' },
      { id: 'b', at: 1200_000, artist: 'B', track: 'two' },
      { id: 'c', at: 1400_000, artist: 'B', track: 'three' },
    ];
    expect(songAt(1250_000, songs)?.track).toBe('two');
    expect(songAt(900_000, songs)).toBeUndefined();
    expect(songAt(1400_000 + 7 * 60_000, songs)).toBeUndefined();
    expect(topWorkoutArtists(songs)).toEqual([{ artist: 'B', plays: 2 }, { artist: 'A', plays: 1 }]);
  });
});
