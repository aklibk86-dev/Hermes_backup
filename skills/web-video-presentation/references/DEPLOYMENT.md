# 视频演示项目部署指南

当用户在远程环境（无法访问 localhost）时，将构建好的演示项目部署到可访问的服务器上。

## 快速部署命令

假设使用 1Panel 管理的 VPS + Cloudflare DNS：

### Step 1: 构建

```bash
cd presentation
npx vite build
```

### Step 2: 复制到 VPS

```bash
# 建立工作目录
ssh root@VPS_IP "mkdir -p /opt/presentation-demo"

# 传输构建产物
cd dist && tar czf - . | ssh root@VPS_IP "tar xzf - -C /opt/presentation-demo"
```

### Step 3: 启动 HTTP 服务器

```bash
ssh root@VPS_IP "cd /opt/presentation-demo && nohup python3 -m http.server 9899 > /tmp/pres.log 2>&1 &"
```

### Step 4: 添加 Nginx 配置

```bash
ssh root@VPS_IP 'cat > /opt/1panel/apps/openresty/openresty/conf/default/pres.conf << '\''EOF'\''
server {
    listen 80;
    server_name pres.example.com;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:9899;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
'\'''

# 测试并重载
docker exec 1Panel-openresty-qMxV nginx -t
docker exec 1Panel-openresty-qMxV nginx -s reload
```

### Step 5: 添加 Cloudflare DNS 记录

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: $EMAIL" \
  -H "X-Auth-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"pres","content":"'$VPS_IP'","proxied":true,"ttl":1}'
```

### Step 6: 验证

DNS 生效后（通常 1-2 分钟），用户可访问 `https://pres.example.com`

## SSH 口令认证替代方案

当 VPS 仅支持 SSH 口令认证（无 SSH 密钥），且 agent 运行在 Docker 容器中时，标准的 SSH 管道部署无法直接使用。以下方案使用 Python `pexpect` 库实现口令交互式部署。

### 前置条件

```bash
# 安装 pexpect（在虚拟环境中或使用 uv）
pip install pexpect
```

### 部署脚本模板

```python
import pexpect
import os

HOST = "VPS_IP"
PORT = 22                # 非标准端口如 37926
PASSWORD = "your-password"

# Step 1: 打包构建产物
os.chdir("/path/to/presentation/dist")
import subprocess
subprocess.run(["tar", "czf", "/tmp/deploy.tar.gz", "."], check=True)

# Step 2: SCP 到 VPS
print("Uploading...")
child = pexpect.spawn(
    f"scp -o StrictHostKeyChecking=no -P {PORT} /tmp/deploy.tar.gz root@{HOST}:/tmp/"
)
child.expect("password:")
child.sendline(PASSWORD)
child.expect(pexpect.EOF, timeout=30)

# Step 3: SSH 登录并原地替换文件
print("Extracting...")
cmd = (
    f"ssh -o StrictHostKeyChecking=no -p {PORT} root@{HOST} "
    f"cd /opt/presentation-demo && "
    f"rm -rf * .??* 2>/dev/null && "
    f"tar xzf /tmp/deploy.tar.gz -C /opt/presentation-demo && "
    f"rm /tmp/deploy.tar.gz"
)
child = pexpect.spawn(cmd)
child.expect("password:")
child.sendline(PASSWORD)
child.expect(pexpect.EOF, timeout=30)
print(child.before.decode(errors='replace'))
print("Deploy complete!")
```

### 部署脚本

重用脚本位于 [`scripts/deploy-via-password-ssh.sh`](../scripts/deploy-via-password-ssh.sh)，用法：

```bash
bash <skill-path>/scripts/deploy-via-password-ssh.sh ./dist <VPS_IP> <PORT> "<PASSWORD>"
```

### 关键注意事项

- **非标准端口**：使用 `-P {PORT}` 指定（大写 P），与 `-p`（小写 p，用于保持文件时间戳）不同。
- **SSH 主机密钥检查**：始终加 `-o StrictHostKeyChecking=no` 避免首次连接提示。
- **Python 路径**：确保 `pexpect` 在使用的 Python 环境中可用（venv 或全局）。
- **容器隔离**：从 Hermes Agent Docker 容器内部署时，容器内 `localhost` 不等于宿主机 `localhost`。W 如需检查远端服务响应，应通过 Docker 网关 IP（如 `172.17.0.1`）访问，而非 `127.0.0.1`。
- **重复部署**：第二次及以后部署时，HTTP 服务器可能已在运行，只需替换 `/opt/presentation-demo/` 目录下的文件即可 —— 无需重启服务器（`python3 -m http.server` 会自动提供更新后的文件）。
- **端口已占用**：如果端口 9899 已被占用，先 `pkill -f 'http.server 9899'` 再重新启动，或换另一个端口并同步更新 Nginx `proxy_pass`。

## 清理

验收/演示完成后清理临时资源：

```bash
# 停止 HTTP 服务器
ssh root@VPS_IP "pkill -f 'http.server 9899' 2>/dev/null; rm -rf /opt/presentation-demo"

# 删除 Nginx 配置
ssh root@VPS_IP "rm -f /opt/1panel/apps/openresty/openresty/conf/default/pres.conf"
ssh root@VPS_IP "docker exec 1Panel-openresty-qMxV nginx -s reload"

# 删除 DNS 记录（需要记录 ID）
# curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" ...
```

## 没有域名时的替代方案

如果没有可用域名，也可以使用 VPS 公网 IP + 临时端口（需确保端口未被防火墙拦截）。但根据安全规范，所有服务应通过域名 + Cloudflare 代理访问，不要开放未代理的端口。
