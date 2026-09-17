#!/usr/bin/env python3
import gzip
import glob
import re
import sys
from collections import Counter

ip = sys.argv[1] if len(sys.argv) > 1 else "185.231.169.85"
pat = re.compile(r'"([A-Z]+) ([^ ]+) HTTP/[^"]*" (\d+) (\d+)')
path_counter: Counter[str] = Counter()
ua_counter: Counter[str] = Counter()
bytes_total = 0
n = 0

for fp in sorted(glob.glob("/var/log/nginx/cary-access.log*")):
    opener = gzip.open if fp.endswith(".gz") else open
    with opener(fp, "rt", errors="replace") as handle:
        for line in handle:
            if not line.startswith(ip + " "):
                continue
            match = pat.search(line)
            if not match:
                continue
            n += 1
            bytes_total += int(match.group(4))
            path_counter[match.group(2).split("?", 1)[0]] += 1
            ua = line.rsplit('"', 2)[-1].strip()
            ua_counter[ua[:100]] += 1

print(f"IP {ip}")
print(f"requests={n} bytes_gb={bytes_total / 1024 ** 3:.2f}")
print("top_paths", path_counter.most_common(10))
print("top_ua", ua_counter.most_common(5))
