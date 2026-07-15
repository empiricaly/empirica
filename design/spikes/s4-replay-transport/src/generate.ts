// Toy session generator.
//
// Simulates a 2-player number-guessing game (Ada=p1 vs Bo=p2, N rounds) purely as
// per-field `changes` rows written to bun:sqlite, plus a `visibility` table.
//
// Journal shape exercised on purpose:
//  - field overwrites   : game.timer counts down, playerRound.guess revised, player.score
//  - list appends       : chat (public) and per-player log (private) as indexed subkeys
//                         `chat.<n>` / `log.<n>` — an append is an insert row (old_json NULL)
//  - deletions          : game.`typing.<pid>` set then removed (new_json NULL)
//  - admin-only field   : round.secret (must never reach a player view)
//  - DYNAMIC visibility : playerRound.guess is owner-only until its round's
//                         `revealed` flips true — then it becomes visible to everyone.

import { Database } from 'bun:sqlite';
import type { Json } from './types';
import { sk } from './types';
import { rng, randInt, shuffled } from './util';

export interface GenOpts {
  rounds: number;
  chatPerRound: number;
  seed: number;
}

export interface GenResult {
  db: Database;
  maxSeq: number;
  playerIds: string[];
}

const CHAT_LINES = [
  'good luck!',
  'you too',
  'this timer is stressing me out',
  'no hints from me',
  'bold pick',
  'I always guess high',
  'classic',
  'rematch after this?',
  'the secret is definitely 7',
  'it is never 7',
  'ok locking it in',
  'gg',
];

export function generateSession(path: string, opts: GenOpts): GenResult {
  const db = new Database(path, { create: true });
  db.exec(`
    PRAGMA journal_mode = WAL;
    DROP TABLE IF EXISTS changes;
    DROP TABLE IF EXISTS visibility;
    CREATE TABLE changes (
      seq         INTEGER PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      key         TEXT NOT NULL,
      old_json    TEXT,
      new_json    TEXT
    );
    CREATE TABLE visibility (
      priority    INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      key_pattern TEXT NOT NULL,  -- exact key, 'prefix.*', or '*'
      rule        TEXT NOT NULL   -- public | owner | admin | owner-until-revealed
    );
  `);

  // Visibility map: which (entity_type, key) is visible to which player.
  // First matching row (by priority) wins.
  const visRows: Array<[number, string, string, string]> = [
    [10, 'round', 'secret', 'admin'],
    [20, 'round', '*', 'public'],
    [30, 'player', 'log.*', 'owner'],
    [40, 'player', '*', 'public'],
    [50, 'playerRound', 'guess', 'owner-until-revealed'],
    [60, 'playerRound', '*', 'public'],
    [70, 'game', '*', 'public'],
  ];
  const insVis = db.prepare(
    'INSERT INTO visibility (priority, entity_type, key_pattern, rule) VALUES (?, ?, ?, ?)',
  );
  for (const r of visRows) insVis.run(...r);

  const insChange = db.prepare(
    'INSERT INTO changes (seq, entity_type, entity_id, key, old_json, new_json) VALUES (?, ?, ?, ?, ?, ?)',
  );

  // The generator tracks raw state so every row carries a correct old_json.
  const raw = new Map<string, Json>();
  let seq = 0;
  const write = (et: string, eid: string, key: string, value: Json | undefined) => {
    seq++;
    const k = sk(et, eid, key);
    const oldV = raw.has(k) ? raw.get(k)! : undefined;
    insChange.run(
      seq,
      et,
      eid,
      key,
      oldV === undefined ? null : JSON.stringify(oldV),
      value === undefined ? null : JSON.stringify(value),
    );
    if (value === undefined) raw.delete(k);
    else raw.set(k, value);
  };

  const r = rng(opts.seed);
  const players: Array<{ id: string; name: string }> = [
    { id: 'p1', name: 'Ada' },
    { id: 'p2', name: 'Bo' },
  ];
  let chatIdx = 0;
  const logIdx: Record<string, number> = { p1: 0, p2: 0 };

  const run = db.transaction(() => {
    // --- setup ---
    for (const p of players) {
      write('player', p.id, 'name', p.name);
      write('player', p.id, 'score', 0);
    }
    write('game', 'g1', 'stage', 'lobby');

    for (let n = 1; n <= opts.rounds; n++) {
      const rid = `r${n}`;
      const secret = randInt(r, 1, 10);
      write('game', 'g1', 'round', rid);
      write('round', rid, 'idx', n);
      write('round', rid, 'secret', secret); // admin-only — must never leak
      write('round', rid, 'revealed', false);
      write('game', 'g1', 'stage', 'guessing');

      // Build interleavable event streams for the guessing phase. Relative order
      // within a stream is preserved (timer must count down, guesses revise
      // forward); streams are merged in seeded-random order.
      type Ev = () => void;
      const streams: Ev[][] = [];

      streams.push([5, 4, 3, 2, 1, 0].map((t) => () => write('game', 'g1', 'timer', t)));

      const finalGuess: Record<string, number> = {};
      for (const p of players) {
        const prId = `${p.id}~${rid}`;
        const nGuesses = randInt(r, 1, 3); // overwrites of a private field
        const evs: Ev[] = [];
        for (let gi = 0; gi < nGuesses; gi++) {
          const g = randInt(r, 1, 10);
          finalGuess[p.id] = g;
          evs.push(() => write('playerRound', prId, 'guess', g));
        }
        evs.push(() => write('playerRound', prId, 'submitted', true)); // public field on same entity
        evs.push(() => {
          const i = logIdx[p.id]++;
          write('player', p.id, `log.${i}`, `r${n}: I went with ${finalGuess[p.id]}`); // private list append
        });
        streams.push(evs);
      }

      const chatEvs: Ev[] = [];
      for (let c = 0; c < opts.chatPerRound; c++) {
        const author = players[randInt(r, 0, 1)];
        const line = CHAT_LINES[randInt(r, 0, CHAT_LINES.length - 1)];
        chatEvs.push(() => {
          const i = chatIdx++;
          write('game', 'g1', `chat.${i}`, { from: author.id, text: line }); // public list append
        });
      }
      streams.push(chatEvs);

      const typer = players[randInt(r, 0, 1)];
      streams.push([
        () => write('game', 'g1', `typing.${typer.id}`, true),
        () => write('game', 'g1', `typing.${typer.id}`, undefined), // deletion row
      ]);

      // Merge streams: repeatedly pop the head of a random non-empty stream.
      const live = streams.filter((s) => s.length > 0);
      while (live.length > 0) {
        const i = randInt(r, 0, live.length - 1);
        live[i].shift()!();
        if (live[i].length === 0) live.splice(i, 1);
      }

      // --- reveal: the dynamic-visibility flip ---
      write('game', 'g1', 'stage', 'result');
      write('round', rid, 'revealed', true); // opponents' guesses become visible HERE
      const d1 = Math.abs(finalGuess.p1 - secret);
      const d2 = Math.abs(finalGuess.p2 - secret);
      const winner = d1 === d2 ? 'tie' : d1 < d2 ? 'p1' : 'p2';
      write('round', rid, 'winner', winner);
      if (winner !== 'tie') {
        const cur = raw.get(sk('player', winner, 'score')) as number;
        write('player', winner, 'score', cur + 1); // overwrite
      }
      // post-reveal banter
      const author = players[randInt(r, 0, 1)];
      write('game', 'g1', `chat.${chatIdx++}`, { from: author.id, text: winner === author.id ? 'ha!' : 'ugh' });
    }
    write('game', 'g1', 'stage', 'finished');
  });
  run();

  return { db, maxSeq: seq, playerIds: players.map((p) => p.id) };
}
