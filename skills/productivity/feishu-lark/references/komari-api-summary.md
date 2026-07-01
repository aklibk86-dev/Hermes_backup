# Komari 监控系统 API 摘要

## 部署信息
- 域名: status.wf1.one
- 内部端口: 25774
- 容器名: komari
- 镜像: ghcr.io/komari-monitor/komari:latest
- API Key: komari-5FuRroOsaVKJyfj1Oby4QJyY64Tfwo64

## 认证
Bearer Authentication, Header: `Authorization: Bearer <API_KEY>`

## 主要 Endpoints

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/me | 当前用户信息 |
| GET | /api/public | 站点公开设置 |
| GET | /api/admin/nodes | 所有节点信息 |
| GET | /api/admin/node/{id}/status-1min | 节点 1 分钟状态 |
| GET | /api/admin/node/{id}/load-history | 负载历史 |
| GET | /api/admin/node/{id}/ping-history | Ping 历史 |
| GET | /api/admin/ping-tasks | Ping 任务列表 |
| GET | /api/admin/stream/mjpeg | MJPEG 实时状态流 |
| GET | /api/admin/realtime | 实时状态 |

## Agent 开发

Agent 通过 WebSocket 或 HTTP 与服务器通信，使用 JSON-RPC 2.0 协议。

- **v2（默认）WS**: `GET /api/clients/v2/rpc?token={token}`
- **v2 POST 回退**: `POST /api/clients/v2/rpc?token={token}`
- WebSocket 是完整双向模式，POST 仅支持单向上报

## 知识库文档
已保存到飞书知识库「运维文档」下：
- Komari API 文档
- Komari Agent 开发文档
