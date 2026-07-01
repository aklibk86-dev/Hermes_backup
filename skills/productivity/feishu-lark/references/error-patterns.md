# lark-cli Error Patterns & Recovery

## "The specified app does not exist"

### Full error
```
{
  "ok": false,
  "error": {
    "type": "authentication",
    "subtype": "unknown",
    "message": "device authorization failed: Device authorization failed: The specified app does not exist."
  }
}
```

### When it hits
`lark-cli auth login --recommend` fails after `lark-cli config bind` succeeded.

### Root cause
The Feishu app that Hermes was configured with (the app_id stored in Hermes' Feishu gateway config and mirrored into `~/.lark-cli/hermes/config.json`) has been **deleted** or **expired** on Feishu's Open Platform side. `config bind` only copies the app id/secret locally — it doesn't verify the app still exists on Feishu's servers.

### Recovery

1. **Remove stale local config:**
   ```bash
   rm -rf ~/.lark-cli/hermes
   ```

2. **Create a new app:**
   ```bash
   lark-cli config init --new --force-init
   ```
   This generates a link like `https://open.feishu.cn/page/cli?user_code=XXXX-XXXX&...`

3. **Send link to user** — they must open it in their browser and confirm/create the app on Feishu Open Platform.

4. **Wait for user confirmation**, then:
   ```bash
   lark-cli auth login --recommend
   ```
   Same flow — user opens the link in their browser to authorize.

### Prevention
If the Hermes Feishu app was recently deleted or recreated, skip `config bind` entirely and go straight to `config init --new --force-init`.

---

## "unknown subcommand"

### Full error
```
{
  "ok": false,
  "error": {
    "type": "validation",
    "subtype": "invalid_argument",
    "message": "unknown subcommand \"list\" for \"lark-cli config\"",
    "hint": "run `lark-cli config --help` to see available subcommands"
  }
}
```

### When it hits
Running a subcommand that doesn't exist (e.g. `lark-cli config list`).

### Remedy
Check available subcommands with `lark-cli config --help` — there is no `list` subcommand. Use `cat ~/.lark-cli/hermes/config.json` to inspect current config.

---

## Command Times Out (exit code 124)

### When it hits
`lark-cli config init --new --force-init` or `lark-cli auth login --recommend` times out waiting for the user to complete the browser step.

### Output pattern
```
打开以下链接配置应用:
  https://open.feishu.cn/page/cli?user_code=...
等待配置应用...
[Command timed out after 60s]
```

### Remedy
The app WAS created on the Feishu backend (API call succeeded), but the local config wasn't saved because the command didn't complete the handshake. Re-run:
1. Clean: `rm -rf ~/.lark-cli/hermes`
2. Re-init with generous timeout or background mode
3. Give the user the **new** link (old user_code expired)
