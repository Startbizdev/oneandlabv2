#!/usr/bin/env bash
# Analyze nginx cary-access logs: egress by path, IP, and month.
set -euo pipefail
LOG_DIR=/var/log/nginx
MONTH="${1:-ALL}"

echo "=== Analyse trafic nginx (filtre: $MONTH) ==="

analyze_stream() {
  awk -v month="$MONTH" '
    (month == "ALL" || index($0, month)) {
      match($5, /"[A-Z]+ ([^ ]+)/, m)
      path = m[1]
      bytes = $7 + 0
      ip = $1
      total += bytes
      req++
      by_path[path] += bytes
      cnt_path[path]++
      by_ip[ip] += bytes
      cnt_ip[ip]++
    }
    END {
      printf "Requetes: %d\n", req
      printf "Octets logues: %.2f GB\n", total / 1024 / 1024 / 1024
      print "--- Top chemins (octets) ---"
      n = asorti(by_path, idx, "@val_num_desc")
      for (i = 1; i <= (n < 25 ? n : 25); i++) {
        p = idx[i]
        printf "%.2f MB\t%d req\t%s\n", by_path[p] / 1024 / 1024, cnt_path[p], p
      }
      print "--- Top IP (octets) ---"
      n2 = asorti(by_ip, idx2, "@val_num_desc")
      for (i = 1; i <= (n2 < 15 ? n2 : 15); i++) {
        p = idx2[i]
        printf "%.2f MB\t%d req\t%s\n", by_ip[p] / 1024 / 1024, cnt_ip[p], p
      }
    }
  '
}

{
  zcat "$LOG_DIR"/cary-access.log*.gz 2>/dev/null || true
  cat "$LOG_DIR"/cary-access.log "$LOG_DIR"/cary-access.log.1 2>/dev/null || true
} | analyze_stream

echo "=== Interface TX lifetime (depuis boot) ==="
ip -s link show dev ens5 | awk '/TX:/ {getline; print}'

echo "=== Disque ==="
df -h /
