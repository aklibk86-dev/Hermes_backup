# Bulk Whois Domain Check — Implementation Detail

## Why Raw Sockets Instead of python-whois

The `python-whois` library (`pip install python-whois`) fails on this environment because:
1. It tries to resolve the IANA whois server hostname, which throws `[Errno -5] No address associated with hostname`
2. Its internal error handling raises `ConnectionResetError` before reaching the `PywhoisError` catch
3. The `whois` CLI from `apt` cannot be installed without root

**Solution**: Raw TCP socket to `whois.verisign-grs.com:43` — the authoritative whois server for .com/.net TLDs.

## Availability Detection

**Available**: Response contains `"No match for"` somewhere in the text.

```
Domain Name: AABB.COM\r\n
   WHOIS Server: whois.verisign-grs.com\r\n
   ...
   No match for "AABB.COM".\r\n
```

**Registered**: Response contains `Registry Domain ID`, `Creation Date`, `Registrar`, etc.

No `"No match for"` = not available.

## Complete Query Handler

```python
import socket

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
        return "No match for" in resp.decode("utf-8", errors="replace")
    except Exception:
        return None  # Transient failure
```

## Performance: AABB Scan (676 domains)

- **16 threads**, 8s timeout: **~8 seconds** total
- **Result**: 0 available out of 676 (all registered)
- **Errors**: 0

## Domain Pattern Reference

| Pattern | Formula | Count | Search Time (16 threads) |
|---------|---------|-------|--------------------------|
| AABB | `a*a*b*b` | 676 | ~8s |
| ABAB | `a*b*a*b` | 676 | ~8s |
| AAAB | `a*a*a*b` (a!=b) | 650 | ~8s |
| ABBB | `a*b*b*b` (a!=b) | 650 | ~8s |
| NNCC (digit-letter) | `d*d*l*l` | 6,760 | ~90s |
| 4-letter all (any) | `l*l*l*l` | 456,976 | ~2h |
| wf + 2 digits | `wf**` | 100 | ~2s |
| w + digit + f + digit | `w*d*f*d` | 100 | ~2s |
| wf + letter + digit | `wf*l*d` | 260 | ~3s |

## Real-World Availability Data (.net, 2026-06)

| Pattern | Available | Total |
|---------|-----------|-------|
| AABB .net | 0 | 676 |
| ABAB .net | 12 | 650 |
| AAAB .net | 100 | 650 |
| ABBB .net | 75 | 650 |
| wfXX .net (brand-prefixed) | ~560+ | 730 |

**Note**: Every 4-letter pure-alpha .com was registered years ago. Contemporary availability is effectively zero for all 4-letter patterns on .com. For real results, try:
- Alternative TLDs (.net, .cc, .io, .me, .xyz, .top)
- Brand-prefixed patterns (wfXX.net, etc.)
- 5-letter mixed patterns
- Letter+number combinations
