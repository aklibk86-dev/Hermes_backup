#!/usr/bin/env python3
"""
Re-runnable script: check all 676 AABB .com domains for availability.
Usage: python check_aabb.py

Uses raw TCP sockets (no whois CLI needed). Outputs available domains to stdout.
"""
import socket
import string
import concurrent.futures
import time

def check(domain):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(8)
    try:
        sock.connect(("whois.verisign-grs.com", 43))
        sock.send(f"{domain}\r\n".encode())
        resp = b""
        while True:
            data = sock.recv(4096)
            if not data:
                break
            resp += data
        sock.close()
        return domain, "No match for" in resp.decode("utf-8", errors="replace"), None
    except Exception as e:
        sock.close()
        return domain, None, str(e)

if __name__ == "__main__":
    letters = string.ascii_lowercase
    domains = [f"{a}{a}{b}{b}.com" for a in letters for b in letters]
    total = len(domains)
    available = []
    errors = []
    start = time.time()

    print(f"Checking {total} AABB .com domains...\n")

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(check, d): d for d in domains}
        for future in concurrent.futures.as_completed(futures):
            domain, avail, err = future.result()
            if avail:
                available.append(domain)
                print(f"  ✅ {domain}")
            elif err:
                errors.append(domain)

    elapsed = time.time() - start
    print(f"\nDone in {elapsed:.0f}s")
    print(f"Checked: {total}")
    print(f"Available: {len(available)}")
    print(f"Errors: {len(errors)}")
    if available:
        print("\nAvailable domains:")
        for d in sorted(available):
            print(f"  {d}")
