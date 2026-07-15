#!/usr/bin/env bash
# S3 spike: point-in-time restore drill against MinIO.
#
# Runs writer + litestream for 90s, kill -9 both, then `litestream restore
# -timestamp <T_mid>` for a mid-run moment and compares the restored
# max(counter) against the committed-counter log's value at that wall-clock
# instant (the log lines are "<counter> <epoch-ms>").
#
# Usage: pitr-s3.sh [duration-s]
set -euo pipefail

SCRATCH="${SCRATCH:-/tmp/claude-0/-home-user-empirica/6d526b87-61df-5fea-b2b0-aa45c9e6d61f/scratchpad/s3}"
SPIKE="$(cd "$(dirname "$0")" && pwd)"
BUN="${BUN:-/root/.bun/bin/bun}"
LS="${LS:-$SCRATCH/litestream}"
export NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost

DUR="${1:-90}"
RUN_DIR="$SCRATCH/s3drill/pitr"
rm -rf "$RUN_DIR"
mkdir -p "$RUN_DIR"

sed -e "s|__DB_PATH__|$RUN_DIR/app.db|" \
    -e "s|__RUN_PREFIX__|s3drill/pitr|" \
    "$SPIKE/litestream-s3.template.yml" > "$RUN_DIR/litestream.yml"

"$BUN" "$SPIKE/writer.ts" "$RUN_DIR/app.db" "$RUN_DIR/committed.log" \
  > "$RUN_DIR/writer.out" 2>&1 &
WPID=$!
sleep 1
"$LS" replicate -config "$RUN_DIR/litestream.yml" \
  > "$RUN_DIR/litestream.out" 2>&1 &
LSPID=$!

START_EPOCH=$(date +%s)
sleep "$DUR"
kill -9 "$WPID" "$LSPID"
wait "$WPID" 2>/dev/null || true
wait "$LSPID" 2>/dev/null || true

COMMITTED=$(tail -1 "$RUN_DIR/committed.log" | cut -d' ' -f1)

# Mid-run target instant (whole second, RFC3339 UTC).
MID_EPOCH=$(( START_EPOCH + DUR / 2 ))
MID_TS=$(date -u -d "@$MID_EPOCH" +%Y-%m-%dT%H:%M:%SZ)
# Ground truth: last counter whose fsync'd log timestamp <= T_mid.
EXPECTED_AT_MID=$(awk -v lim=$(( MID_EPOCH * 1000 )) '$2 <= lim { c = $1 } END { print c }' "$RUN_DIR/committed.log")

"$LS" restore -config "$RUN_DIR/litestream.yml" -timestamp "$MID_TS" \
  -o "$RUN_DIR/restore-pitr.db" "$RUN_DIR/app.db" > "$RUN_DIR/restore-pitr.out" 2>&1

PITR_JSON=$("$BUN" "$SPIKE/check.ts" "$RUN_DIR/restore-pitr.db")

# Also do a latest restore for reference.
"$LS" restore -config "$RUN_DIR/litestream.yml" \
  -o "$RUN_DIR/restore-latest.db" "$RUN_DIR/app.db" > "$RUN_DIR/restore-latest.out" 2>&1
LATEST_JSON=$("$BUN" "$SPIKE/check.ts" "$RUN_DIR/restore-latest.db")

{
  echo "--- pitr dur_s=$DUR start_epoch=$START_EPOCH mid_ts=$MID_TS"
  echo "committed_ground_truth_at_kill=$COMMITTED"
  echo "expected_counter_at_mid=$EXPECTED_AT_MID"
  echo "pitr_restored=$PITR_JSON"
  echo "latest_restored=$LATEST_JSON"
} | tee -a "$SCRATCH/s3drill/results.txt"
