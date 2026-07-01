# goofish-cli Installation Notes

## Installed on Hermes Agent

- **Version**: 0.2.4 (installed 2026-06-23)
- **Location**: `/opt/hermes/.venv/lib/python3.13/site-packages/goofish_cli/`
- **Binary**: `/opt/hermes/.venv/bin/goofish`
- **MCP binary**: `/opt/hermes/.venv/bin/goofish-mcp`
- **Install method**: `uv pip install goofish-cli` (faster than pip)
- **Dependencies installed**: browser-cookie3, playwright, loguru, typer, pycryptodomex, lz4, pyexecjs, shellingham, greenlet, jeepney, pyee

## Dependencies That May Need System Packages

- `playwright` installs its own browser binaries (~45MB download)
- `browser-cookie3` uses system-level browser cookie databases (works on Linux with Chrome/Firefox)
- `pyexecjs` requires a JS runtime (Node.js recommended — check with `which node`)

## PATH Setup

```bash
# Symlink (need root)
sudo ln -sf /opt/hermes/.venv/bin/goofish /usr/local/bin/goofish

# Or alias in ~/.bashrc
echo 'alias goofish="/opt/hermes/.venv/bin/goofish"' >> ~/.bashrc
```

## Verifying Installation

```bash
goofish version       # → goofish-cli 0.2.4
goofish --help        # → command list
goofish auth status   # → check if logged in (needs cookie first)
```
