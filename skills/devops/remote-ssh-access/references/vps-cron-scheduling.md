# Schedule Python Scripts as Cron Jobs on Remote VPS

## Deploy the Script

Use paramiko + base64 encoding to write the script file on the remote host:

```python
import base64, paramiko

script_content = '#!/usr/bin/env python3\n...'
b64 = base64.b64encode(script_content.encode()).decode()

ssh.exec_command(f"python3 -c \"import base64; open('/opt/myscript.py','w').write(base64.b64decode('{b64}').decode())\" && chmod +x /opt/myscript.py")
```

## Install cron (if missing)

On Debian 13, `crontab` may not be installed:
```bash
apt-get install -y cron
systemctl enable --now cron
```

## Schedule the Job

```bash
(crontab -l 2>/dev/null; echo "0 9 * * * /usr/bin/python3 /opt/script.py > /var/log/script.log 2>&1") | crontab -
```

Time: `0 9 * * *` = 09:00 UTC daily. Add 8h for CST/北京时间.

## Test Before Scheduling

Always run the script manually once first:
```bash
python3 /opt/script.py
```

Verify with `crontab -l`.

## Pitfalls

- `crontab` may be missing on minimal Debian installs. Install `cron` package first.
- Script output goes nowhere by default — always redirect to a log file.
- Use absolute Python path `/usr/bin/python3` in crontab.
- Scripts accessing `127.0.0.1` must run on the host (not in a container).
- `datetime.utcnow()` deprecated in Python 3.13+ — use `datetime.now(datetime.UTC)` instead.
- **Time zone**: cron uses server local time (usually UTC). `0 9 * * *` = 09:00 UTC = 17:00 Beijing. Use `timedatectl` to check server timezone.
- **Old data trap**: scripts that analyze API data may include historical records captured before rule changes. New rules only affect future data — never assume a cron report reflects newly-changed rules until the next full cycle.
