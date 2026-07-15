#!/usr/bin/env bash
# S3 spike drill, real-S3 edition: WAL-mode SQLite under continuous writes,
# litestream replicating to MinIO (S3 API on 127.0.0.1:9000); kill -9; restore
# from the object store; measure the committed-transaction loss gap.
#
# Usage: run-drill-s3.sh <run-name> <ls-first|writer-first|simultaneous|ls-dead-linger> [duration-s]
#
# Kill modes:
#   ls-first        kill -9 litestream, 0.25s later kill -9 writer
#   writer-first    kill -9 writer, 0.25s later kill -9 litestream
#   simultaneous    kill -9 both in one shot
#   ls-dead-linger  kill -9 litestream, writer keeps committing for 5 MORE
#                   seconds, then kill -9 writer. Demonstrates that it is the
#                   REPLICATOR's death that opens the loss window: every txn
#                   committed after litestream dies is lost on restore.
set -euo pipefail

SCRATCH="${SCRATCH:-/tmp/claude-0/-home-user-empirica/6d526b87-61df-5fea-b2b0-aa45c9e6d61f/scratchpad/s3}"
SPIKE="$(cd "$(dirname "$0")" && pwd)"
BUN="${BUN:-/root/.bun/bin/bun}"
LS="${LS:-$SCRATCH/litestream}"   # official v0.3.13 release binary (via npm repack)

# MinIO is local; make sure litestream's HTTP client does NOT go through the
# session's egress proxy.
export NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost

RUN_N="$1"
KILL_MODE="$2"
DUR="${3:-$((60 + RANDOM % 6))}"   # spec: run ~60s, kill at a random moment

RUN_DIR="$SCRATCH/s3drill/$RUN_N"
rm -rf "$RUN_DIR"
mkdir -p "$RUN_DIR"

sed -e "s|__DB_PATH__|$RUN_DIR/app.db|" \
    -e "s|__RUN_PREFIX__|s3drill/$RUN_N|" \
    "$SPIKE/litestream-s3.template.yml" > "$RUN_DIR/litestream.yml"

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
  ls-first)       kill -9 "$LSPID"; sleep 0.25; kill -9 "$WPID" ;;
  writer-first)   kill -9 "$WPID"; sleep 0.25; kill -9 "$LSPID" ;;
  simultaneous)   kill -9 "$WPID" "$LSPID" ;;
  ls-dead-linger) kill -9 "$LSPID"; sleep 5; kill -9 "$WPID" ;;
  *) echo "bad kill mode: $KILL_MODE" >&2; exit 1 ;;
esac
KILL_EPOCH=$(date +%s)
wait "$WPID" 2>/dev/null || true
wait "$LSPID" 2>/dev/null || true

COMMITTED=$(tail -1 "$RUN_DIR/committed.log" | cut -d' ' -f1)
MID_EPOCH=$(( START_EPOCH + DUR / 2 ))
MID_TS=$(date -u -d "@$MID_EPOCH" +%Y-%m-%dT%H:%M:%SZ)

# Restore from the OBJECT STORE to a fresh path.
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
} | tee -a "$SCRATCH/s3drill/results.txt"
