#!/usr/bin/env python3
"""Parse nginx cary-access logs and summarize egress by path and IP."""
from __future__ import annotations

import gzip
import glob
import re
from collections import defaultdict

PAT = re.compile(r'"([A-Z]+) ([^ ]+) HTTP/[^"]*" (\d+) (\d+)')


def main() -> None:
    by_path: dict[str, int] = defaultdict(int)
    by_path_n: dict[str, int] = defaultdict(int)
    by_ip: dict[str, int] = defaultdict(int)
    by_prefix: dict[str, int] = defaultdict(int)
    total = 0
    n = 0
    files = sorted(glob.glob("/var/log/nginx/cary-access.log*"))

    for fp in files:
        opener = gzip.open if fp.endswith(".gz") else open
        try:
            with opener(fp, "rt", errors="replace") as handle:
                for line in handle:
                    match = PAT.search(line)
                    if not match:
                        continue
                    ip = line.split()[0]
                    path = match.group(2)
                    bytes_ = int(match.group(4))
                    total += bytes_
                    n += 1
                    by_path[path] += bytes_
                    by_path_n[path] += 1
                    by_ip[ip] += bytes_
                    prefix = path.split("?", 1)[0]
                    if prefix.startswith("/api/"):
                        parts = prefix.split("/")
                        pfx = f"/api/{parts[2]}" if len(parts) > 2 else prefix
                    elif prefix.startswith("/_nuxt/"):
                        pfx = "/_nuxt/*"
                    else:
                        pfx = prefix if len(prefix) < 60 else prefix[:57] + "..."
                    by_prefix[pfx] += bytes_
        except OSError as err:
            print(f"skip {fp}: {err}")

    print("=== Logs cary-access disponibles sur le serveur ===")
    print(f"Fichiers: {len(files)}")
    print(f"Requetes parsees: {n:,}")
    print(f"Octets logues (body nginx): {total / 1024 ** 3:.2f} GB")
    print("--- Top prefixes ---")
    for path, size in sorted(by_prefix.items(), key=lambda item: -item[1])[:20]:
        print(f"{size / 1024 ** 2:8.1f} MB  {path}")
    print("--- Top chemins ---")
    for path, size in sorted(by_path.items(), key=lambda item: -item[1])[:25]:
        print(f"{size / 1024 ** 2:8.1f} MB  {by_path_n[path]:6d}  {path[:120]}")
    print("--- Top IP ---")
    for ip, size in sorted(by_ip.items(), key=lambda item: -item[1])[:15]:
        print(f"{size / 1024 ** 2:8.1f} MB  {ip}")


if __name__ == "__main__":
    main()
