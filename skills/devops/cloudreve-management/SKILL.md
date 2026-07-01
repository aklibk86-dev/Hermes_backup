---
name: cloudreve-management
category: devops
description: Deploy, configure, and manage Cloudreve cloud storage system with object storage backends (Alibaba OSS, S3, COS). Covers PostgreSQL database discovery, storage policy CRUD, OSS bucket creation, and group assignment.
triggers:
  - "cloudreve"
  - "cloudreve storage"
  - "cloudreve oss"
  - "cloudreve cos"
  - "cloudreve s3"
  - "cloudreve policy"
  - "object storage cloudreve"
---

# Cloudreve Management

Deploy and configure Cloudreve (self-hosted cloud storage) with object storage backends in production.

## Architecture

Cloudreve stores metadata in **PostgreSQL** (or SQLite for dev) and routes file uploads to a configured **storage policy** (local, OSS, S3, COS, etc.).

## Database Discovery

Cloudreve uses PostgreSQL under 1Panel (or standalone). The database name and user are dynamically generated — you must discover them:

### 1. Find the PostgreSQL container

```bash
docker ps | grep postgres
# e.g. 1Panel-postgresql-qqLl
```

### 2. List databases

```bash
docker exec <pg-container> psql -U postgres -c "\\\\l"
# Look for cloudreve_* databases
```

**⚠️ 1Panel password masking**: `POSTGRES_PASSWORD=***` is shown by `printenv`. Don't rely on it — use `docker exec` which works via trust auth (local socket).

### 3. Find the correct user

```bash
docker exec <pg-container> psql -U postgres -c "\\\\du"
# Look for a user like cloudreve_XXXXX
```

### 4. Query Cloudreve tables

Cloudreve v4 creates tables in the `public` schema with these key tables:

| Table | Purpose |
|-------|---------|
| `users` | Admin/user accounts (NOT `ia_user` — old docs are wrong) |
| `storage_policies` | Object storage configurations |
| `groups` | User groups with linked storage policies |
| `files` | File metadata |

```bash
docker exec <pg-container> psql -U cloudreve_user -d cloudreve_db -c "SELECT id, email, password FROM users;"
docker exec <pg-container> psql -U cloudreve_user -d cloudreve_db -c "SELECT id, name, type, bucket_name, access_key, settings FROM storage_policies;"
docker exec <pg-container> psql -U cloudreve_user -d cloudreve_db -c "SELECT id, name, storage_policy_id FROM groups;"
```

## Password Reset

Hash format: **scrypt** for Cloudreve 4.16.1+, NOT bcrypt. If you set a bcrypt hash (`$2a$...`), login will fail.

**Correct approach**: Use the Cloudreve web UI forgot-password flow, or reset via PostgreSQL and clear the password field to trigger a new hash on next login:

```sql
UPDATE users SET password = '' WHERE email = 'admin@example.com';
```

Then log in — Cloudreve will prompt to set a new password.

## Storage Policy Management

### Schema

```sql
-- Key columns of storage_policies
id          bigint          -- PK
name        varchar         -- Display name (e.g. "阿里", "腾讯云COS")
type        varchar         -- "oss" | "remote" | "local" | "s3"
server      varchar         -- Endpoint URL (e.g. "oss-cn-hongkong.aliyuncs.com")
bucket_name varchar         -- Bucket name
access_key  text            -- AccessKeyId
secret_key  text            -- SecretKey
is_private  boolean         -- Private bucket?
settings    jsonb           -- Additional config (region, chunk_size, etc.)
```

### Create Alibaba Cloud OSS Policy

1. **Create the OSS bucket** via the Python SDK:

```python
import oss2
auth = oss2.Auth('AccessKeyId', 'AccessKeySecret')
bucket = oss2.Bucket(auth, 'oss-cn-hongkong.aliyuncs.com', 'bucket-name')
bucket.create_bucket(oss2.BUCKET_ACL_PRIVATE)
```

2. **Insert/update the policy in PostgreSQL**:

```sql
UPDATE storage_policies SET
  server = 'oss-cn-hongkong.aliyuncs.com',
  bucket_name = 'my-bucket',
  access_key = 'LTAI5t...',
  secret_key = '...',
  is_private = true,
  settings = '{"region": "cn-hongkong", "chunk_size": 26214400}'
WHERE id = <policy_id>;
```

### Assign Policy to Groups

```sql
-- Update group to use the OSS policy
UPDATE groups SET storage_policy_id = <policy_id> WHERE id = 1;  -- Admin
UPDATE groups SET storage_policy_id = <policy_id> WHERE id = 2;  -- User
```

### Verify

Test the OSS bucket directly:
```python
bucket.put_object('__test__.txt', b'test')
result = bucket.get_object('__test__.txt')
print(result.read())
bucket.delete_object('__test__.txt')
```

## Critical Pitfalls

### 1. Table names differ from old docs

Cloudreve v4 uses `users`, `storage_policies`, `groups` — NOT `ia_user`, `ia_policy` as seen in outdated references. Always verify with `\\\\dt` first.

### 2. Password hash format

Cloudreve 4.16.1 uses **scrypt**, not bcrypt. Setting a bcrypt `$2a$` hash in the database will appear to work (row updates) but login will fail silently.

### 3. 1Panel PostgreSQL user names are dynamic

Database names and user names are randomly suffixed (e.g., `1Panel-postgresql-qqLl`, `cloudreve_7y6xt7`). Always discover via `docker ps` + `\\\\l` + `\\\\du` — never hardcode.

### 4. OSS bucket creation requires SDK

Cloudreve only stores the credential config — it does NOT create the bucket. Create it separately via the Alibaba Cloud OSS SDK (`oss2`) or the cloud console.

### 5. ACL warning on `get_bucket_info()`

The `acl` attribute of `get_bucket_info()` returns an `AccessControlList` object, not a string. Print it via `info.acl.__dict__` or `str(info.acl)` if you need to inspect it.

## References

- Cloudreve GitHub: https://github.com/cloudreve/Cloudreve
- Alibaba OSS SDK: https://github.com/aliyun/aliyun-oss-python-sdk
- oss2 docs: https://oss2.readthedocs.io/
