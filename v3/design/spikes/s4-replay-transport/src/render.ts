// Minimal UI proof: render(store, viewer) -> string. This is "the actual client
// UI" for the spike: it only reads the mirror store, so it renders identically
// under live or replay — the scrubber just re-renders after each patch.

import type { Json } from './types';
import type { MirrorStore } from './store';

const s = (v: Json | undefined, fallback = '—') => (v === undefined ? fallback : String(v));

export function render(store: MirrorStore, viewer: string): string {
  const opp = viewer === 'p1' ? 'p2' : 'p1';
  const name = (pid: string) => s(store.get('player', pid, 'name'), pid);
  const rid = store.get('game', 'g1', 'round') as string | undefined;
  const stage = s(store.get('game', 'g1', 'stage'));
  const timer = s(store.get('game', 'g1', 'timer'));
  const idx = rid ? s(store.get('round', rid, 'idx')) : '—';
  const revealed = rid ? store.get('round', rid, 'revealed') === true : false;
  const winner = rid ? store.get('round', rid, 'winner') : undefined;
  const myGuess = rid ? store.get('playerRound', `${viewer}~${rid}`, 'guess') : undefined;
  const oppGuessRaw = rid ? store.get('playerRound', `${opp}~${rid}`, 'guess') : undefined;
  const oppSubmitted = rid ? store.get('playerRound', `${opp}~${rid}`, 'submitted') === true : false;
  // NOTE: the client does not decide visibility — if the opponent guess key is
  // absent from the store, it simply is not in this player's view.
  const oppGuess =
    oppGuessRaw !== undefined ? String(oppGuessRaw) : oppSubmitted ? '(hidden, submitted)' : '(hidden)';
  const secretLeak = rid ? store.get('round', rid, 'secret') : undefined;

  const chat = store
    .listByPrefix('game|g1|chat.')
    .slice(-3)
    .map(({ value }) => {
      const m = value as { from: string; text: string };
      return `[${name(m.from)}] ${m.text}`;
    });
  const log = store
    .listByPrefix(`player|${viewer}|log.`)
    .slice(-2)
    .map(({ value }) => String(value));
  const typing = ['p1', 'p2']
    .filter((p) => store.get('game', 'g1', `typing.${p}`) === true)
    .map(name);

  const lines = [
    `viewer=${name(viewer)}(${viewer})  seq=${store.seq}`,
    `round ${idx}  stage=${stage}  timer=${timer}${typing.length ? `  [${typing.join(',')} typing…]` : ''}`,
    `score  ${name('p1')}=${s(store.get('player', 'p1', 'score'))}  ${name('p2')}=${s(store.get('player', 'p2', 'score'))}`,
    `your guess: ${s(myGuess, '(none)')}   ${name(opp)}'s guess: ${oppGuess}${revealed ? `   winner: ${s(winner)}` : ''}`,
    `chat: ${chat.length ? chat.join('  |  ') : '(empty)'}`,
    `my log: ${log.length ? log.join('  |  ') : '(empty)'}`,
  ];
  if (secretLeak !== undefined) lines.push(`!!! LEAK: round.secret=${String(secretLeak)} visible to player !!!`);
  const w = Math.max(...lines.map((l) => l.length));
  const bar = '─'.repeat(w + 2);
  return [`┌${bar}┐`, ...lines.map((l) => `│ ${l.padEnd(w)} │`), `└${bar}┘`].join('\n');
}
