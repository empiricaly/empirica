#!/usr/bin/env bash
# S3 spike drill: WAL-mode SQLite under continuous writes + litestream
# replicating to a file:// replica; kill -9 both; restore; measure the
# committed-transaction loss gap.
#
# Usage: run-drill.sh <run-number> <ls-first|writer-first|simultaneous> [duration-s]
set -euo pipefail

SCRATCH="${SCRATCH:-/tmp/claude-0/-home-user-empirica/6d526b87-61df-5fea-b2b0-aa45c9e6d61f/scratchpad/s3}"
SPIKE="$(cd "$(dirname "$0")" && pwd)"
BUN="${BUN:-/root/.bun/bin/bun}"
LS="${LS:-$SCRATCH/bin/litestream}"

RUN_N="$1"
KILL_MODE="$2"
DUR="${3:-$((45 + RANDOM % 15))}"   # kill at a "random moment" ~45-59s in

RUN_DIR="$SCRATCH/drill/run$RUN_N"
rm -rf "$RUN_DIR"
mkdir -p "$RUN_DIR/replica"

sed -e "s|__DB_PATH__|$RUN_DIR/app.db|" \
    -e "s|__REPLICA_PATH__|$RUN_DIR/replica|" \
    "$SPIKE/litestream.template.yml" > "$RUN_DIR/litestream.yml"

# Writer first so the DB file exists when litestream starts.
"$BUN" "$SPIKE/writer.ts" "$RUN_DIR/app.db" "$RUN_DIR/committed.log" \
  > "$RUN_DIR/writer.out" 2>&1 &
WPID=$!
sleep 1
"$LS" replicate -config "$RUN_DIR/litestream.yml" \
  > "$RUN_DIR/litestream.out" 2>&1 &
LSPID=$!

START_EPOCH=$(date +%s)
sleep "$DUR"

case "$KILL_MODE" in
  ls-first)     kill -9 "$LSPID"; sleep 0.25; kill -9 "$WPID" ;;
  writer-first) kill -9 "$WPID"; sleep 0.25; kill -9 "$LSPID" ;;
  simultaneous) kill -9 "$WPID" "$LSPID" ;;
  *) echo "bad kill mode: $KILL_MODE" >&2; exit 1 ;;
esac
KILL_EPOCH=$(date +%s)
wait "$WPID" 2>/dev/null || true
wait "$LSPID" 2>/dev/null || true

COMMITTED=$(tail -1 "$RUN_DIR/committed.log" | cut -d' ' -f1)
MID_EPOCH=$(( START_EPOCH + DUR / 2 ))
MID_TS=$(date -u -d "@$MID_EPOCH" +%Y-%m-%dT%H:%M:%SZ)

# Restore from the replica to a fresh path.
"$LS" restore -config "$RUN_DIR/litestream.yml" -o "$RUN_DIR/restore.db" \
  "$RUN_DIR/app.db" > "$RUN_DIR/restore.out" 2>&1

RESTORED_JSON=$("$BUN" "$SPIKE/check.ts" "$RUN_DIR/restore.db")
# The crashed local DB (WAL recovery on open) — for comparison only.
CRASHED_JSON=$("$BUN" "$SPIKE/check.ts" "$RUN_DIR/app.db")

{
  echo "--- run=$RUN_N kill_mode=$KILL_MODE dur_s=$DUR start_epoch=$START_EPOCH kill_epoch=$KILL_EPOCH mid_ts=$MID_TS"
  echo "committed_ground_truth=$COMMITTED"
  echo "restored=$RESTORED_JSON"
  echo "crashed_local=$CRASHED_JSON"
} | tee -a "$SCRATCH/drill/results.txt"
