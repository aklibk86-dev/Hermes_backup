# Hermes Integration with lark-cli

## Config Locations

| What | Path |
|------|------|
| lark-cli workspace config | `~/.lark-cli/hermes/config.json` |
| Hermes Feishu gateway config | `~/.hermes/config.yaml` (feishu section) |
| Hermes Feishu app credentials | `~/.hermes/.env` (FEISHU_APP_ID, FEISHU_APP_SECRET) |

## How `lark-cli config bind` Works

`lark-cli config bind --source hermes`:

1. Reads Hermes' Feishu app credentials from Hermes' config/.env
2. Copies the app_id and app_secret into `~/.lark-cli/hermes/config.json`
3. Sets `defaultAs: "user"` for the identity preset
4. Creates the workspace directory if it doesn't exist

It does **NOT** verify the app still exists on Feishu's servers.

## Profile Awareness

If Hermes is running under a non-default profile, lark-cli credentials live under that profile's paths:

```
~/.hermes/profiles/<name>/.env     # Feishu credentials
~/.hermes/profiles/<name>/.lark-cli/  # lark-cli workspace
```

Actually, lark-cli always uses `~/.lark-cli/` for its workspace regardless of Hermes profile. For multi-profile setups, each profile would need its own lark-cli workspace, which isn't currently supported — this is a known limitation.

## Current Known Limitation

- lark-cli's Hermes workspace is **global** (not per-profile)
- Re-binding with `config bind` overwrites the single Hermes workspace
- Multi-profile Feishu integration isn't supported without manual workspace management
