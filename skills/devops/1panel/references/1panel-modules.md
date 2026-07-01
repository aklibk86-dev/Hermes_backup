# 1Panel API Module Reference

Module-by-module breakdown of the 1Panel-skills capabilities, sourced from the official documentation and the [1Panel-dev/1Panel-skills](https://github.com/1Panel-dev/1Panel-skills) project.

## monitoring

Check server health, resource usage, and historical metrics.

| Action | Description |
|--------|-------------|
| `getCurrentNode` | Current node status (OS, uptime, CPU/memory/disk usage) |
| `getDashboard` | Dashboard metrics overview |
| `getTopProcesses` | Top CPU/memory consuming processes |
| `getMonitorHistory` | Historical monitoring data |
| `getGPUHistory` | GPU metrics history |

**API endpoints:**
- `GET /api/v2/dashboard/base/os` — OS info
- `GET /api/v2/dashboard/base/system` — System metrics
- `GET /api/v2/dashboard/base/process` — Top processes

## websites

Manage and inspect websites, Nginx configs, SSL certs.

| Action | Description |
|--------|-------------|
| `searchWebsites` | List/query websites (with pagination) |
| `getWebsiteDetail` | Single website details |
| `getWebsiteNginxConfig` | Nginx configuration for a site |
| `getWebsiteDomains` | Domain bindings |
| `getWebsiteHTTPS` | HTTPS configuration |
| `getWebsiteSSL` | SSL certificate info |
| `getWebsiteLog` | Website access/error logs |

**API endpoints (prefix: `/api/v2/websites`):**
- `POST /api/v2/websites/search`
- `GET /api/v2/websites/{id}`
- `GET /api/v2/websites/{id}/config`
- `GET /api/v2/websites/{id}/domains`
- `GET /api/v2/websites/{id}/https`
- `GET /api/v2/websites/{id}/ssl`
- `GET /api/v2/websites/{id}/log`

## apps

Query the 1Panel app marketplace and installed applications.

| Action | Description |
|--------|-------------|
| `getAppMarket` | Browse available apps in the marketplace |
| `getInstalledApps` | List installed apps with their status |
| `getAppService` | Service information for an app |
| `getAppPorts` | Port and connection info |

**API endpoints (prefix: `/api/v2/apps`):**
- `POST /api/v2/apps/search`
- `GET /api/v2/apps/{id}`
- `GET /api/v2/apps/{id}/service`
- `GET /api/v2/apps/{id}/ports`

## containers

Inspect Docker containers managed by 1Panel.

| Action | Description |
|--------|-------------|
| `searchContainers` | List containers with filters |
| `getContainerStatus` | Container running status |
| `inspectContainer` | Detailed container inspect info |
| `getContainerStats` | Resource usage stats |
| `getContainerLog` | Container log output |

**API endpoints (prefix: `/api/v2/containers`):**
- `POST /api/v2/containers/search`
- `GET /api/v2/containers/{id}/status`
- `GET /api/v2/containers/{id}/inspect`
- `GET /api/v2/containers/{id}/stats`
- `GET /api/v2/containers/{id}/log`

## logs

Access system and operation logs.

| Action | Description |
|--------|-------------|
| `getOperationLogs` | User operation audit logs |
| `getLoginLogs` | Login attempt history |
| `listSystemLogFiles` | Available system log files |
| `readLogFile` | Read contents of a specific log file |

**API endpoints (prefix: `/api/v2/logs`):**
- `GET /api/v2/logs/operation`
- `GET /api/v2/logs/login`
- `GET /api/v2/logs/system`
- `GET /api/v2/logs/system/{filename}`

## cronjobs

Manage scheduled tasks.

| Action | Description |
|--------|-------------|
| `searchCronJobs` | List cron jobs with filters |
| `getCronJobDetail` | Single cron job details |
| `getCronJobPreview` | Preview next execution time |
| `getCronJobRecords` | Execution history records |
| `getCronJobRecordLog` | Log of a specific execution |
| `getCronJobScriptOptions` | Available script options |

**API endpoints (prefix: `/api/v2/cronjobs`):**
- `POST /api/v2/cronjobs/search`
- `GET /api/v2/cronjobs/{id}`
- `GET /api/v2/cronjobs/{id}/preview`
- `GET /api/v2/cronjobs/{id}/records`
- `GET /api/v2/cronjobs/{id}/records/{recordId}/log`
- `GET /api/v2/cronjobs/script/options`

## task-center

Check background task progress.

| Action | Description |
|--------|-------------|
| `getTaskRecords` | Task center execution records |
| `getExecutingCount` | Number of currently executing tasks |

**API endpoints (prefix: `/api/v2/tasks`):**
- `POST /api/v2/tasks/search`
- `GET /api/v2/tasks/executing/count`

## nodes

Multi-node management (may require Pro/XPack).

| Action | Description |
|--------|-------------|
| `searchNodes` | Full node list with details |
| `listNodes` | Simplified node list |
| `getNodeOptions` | Available node connection options |
| `getNodeStatus` | Node connectivity status |

**API endpoints (prefix: `/api/v2/nodes`):**
- `POST /api/v2/nodes/search`
- `GET /api/v2/nodes`
- `GET /api/v2/nodes/options`
- `GET /api/v2/nodes/{id}/status`

> **Note:** Node-related endpoints may require 1Panel Pro or XPack license.
