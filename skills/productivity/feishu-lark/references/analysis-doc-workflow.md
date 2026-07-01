# Creating Analysis Documents as Feishu Docs

## Use Case

When the user asks for an analysis, comparison, guide, or any structured written content (not quick answers), deliver it as a Feishu document instead of as chat text.

**Current user preference**: "以后像这种文件直接以飞鼠文档的形式发给我" — all structured analysis/comparison/plan/documentation content must be delivered as a Feishu doc link. See SKILL.md §0 for detailed guidance.

## Workflow

1. Write the content as a Markdown file locally (write_file)
2. Copy it to the VPS (SSH stdin pipe, then docker cp into container)
3. Import via lark-cli drive +import
4. Send the Feishu doc URL to the user

## Step-by-Step

### Step 1-2: Write content and pipe to VPS

```python
# Locally (in Hermes workspace):
write_file(path="/tmp/doc-name.md", content=mkd_content)

# Then in execute_code:
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("149.104.8.237", port=37926, username="root", password="ecwoVMLX4252")

# Read local file
with open("/tmp/doc-name.md", "r") as f:
    content = f.read()

# Write to VPS /tmp via SSH stdin
stdin, stdout, stderr = ssh.exec_command("cat > /tmp/doc-name.md")
stdin.write(content)
stdin.close()
```

### Step 3: Copy to container and import

```python
# Copy to hermes container
stdin, stdout, stderr = ssh.exec_command(
    "docker cp /tmp/doc-name.md 1Panel-hermes-agent-UZQ9:/tmp/doc-name.md"
)

# Import as Feishu doc
lark_env = "export HOME=/opt/data/home; export PATH=$HOME/.npm-global/bin:$PATH"
cmd = (
    "docker exec 1Panel-hermes-agent-UZQ9 bash -c "
    "'cd /tmp && " + lark_env + "; "
    "lark-cli drive +import --file ./doc-name.md "
    '--type docx --name "My Document Title" --format pretty 2>&1\''
)
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode())  # Parse URL from JSON output
```

### Step 4: Send the link

Present the URL directly: `https://rcn4xp25thz3.feishu.cn/docx/TOKEN`

## Pitfalls

- The lark-cli `--file` path must be relative, not absolute. Always `cd /tmp` first
- The file must exist inside the Docker container, not just on the VPS host
- Document titles in the Markdown `# Title` must be the only first-level heading
- Import format `--type docx` works for markdown files (converted to Feishu docx)
- The `--format pretty` flag produces cleaner output
- JSON parsing may fail on first attempt if lark-cli outputs non-JSON lines (upload progress); use `print(stdout.read().decode())` to inspect before parsing
- After deleting the services documented (e.g., New-API/Sub2API), the Feishu docs remain — update or archive them in Feishu manually if they reference deleted infrastructure
- The 1Panel-hermes-agent container name ends with a random suffix (-UZQ9); always check with `docker ps | grep hermes` before using docker cp
