# Alibaba Cloud OSS Bucket Creation for Cloudreve

## Overview

When configuring an Alibaba Cloud OSS storage policy in Cloudreve (deployed via 1Panel), you need to:
1. Create the bucket on Alibaba Cloud
2. Add/update the storage policy in the Cloudreve database
3. (Optional) Assign the policy to a user group via the Cloudreve admin UI

## Prerequisites

- Alibaba Cloud RAM user AccessKeyId and AccessKeySecret with OSS full access
- `oss2` Python SDK installed: `uv pip install oss2`

## Create the OSS Bucket

```python
import oss2

access_key_id = "LTAI5t..."
access_key_secret = "ZEKt..."
bucket_name = "my-bucket"
region = "cn-hongkong"  # or cn-shanghai, cn-beijing, etc.
endpoint = f"oss-{region}.aliyuncs.com"

auth = oss2.Auth(access_key_id, access_key_secret)
bucket = oss2.Bucket(auth, endpoint, bucket_name)

# Create private bucket
bucket.create_bucket(oss2.BUCKET_ACL_PRIVATE)

# Verify
info = bucket.get_bucket_info()
print(f"Name: {info.name}, Region: {info.location}")
```

## Update Cloudreve Storage Policy Database

Connect to the Cloudreve PostgreSQL database (via the 1Panel PostgreSQL container):

```bash
# 1. Find PG container
PG_CONTAINER=$(docker ps --filter ancestor=postgres --format "{{.Names}}")

# 2. Find DB user
DB_USER=$(docker exec $PG_CONTAINER printenv | grep POSTGRES_USER | cut -d= -f2)

# 3. Find cloudreve database
DB_NAME=$(docker exec $PG_CONTAINER psql -U $DB_USER -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'cloudreve%';" | tr -d ' ')

# 4. Find cloudreve DB owner role
OWNER_ROLE=$(docker exec $PG_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT rolname FROM pg_catalog.pg_roles WHERE rolname LIKE 'cloudreve%';" | tr -d ' ')

# 5. Update or insert the OSS policy
docker exec $PG_CONTAINER psql -U $OWNER_ROLE -d $DB_NAME \
  -c "UPDATE storage_policies SET
        bucket_name = 'my-bucket',
        server = 'oss-cn-hongkong.aliyuncs.com',
        access_key = 'LTAI5t...',
        secret_key = 'ZEKt...',
        settings = '{\"region\": \"cn-hongkong\", \"file_type\": null, \"chunk_size\": 26214400, \"native_media_processing\": false}',
        updated_at = NOW()
      WHERE id = 3;"
```

> Note: The `settings` JSONB column includes fields like `region`, `chunk_size`, `thumb_exts`, `media_meta_exts`, `chunk_concurrency`, `thumb_generator_proxy`, `native_media_processing`, and `media_meta_generator_proxy`.

## Assign Policy to User Groups

After creating the OSS policy, assign it to one or more user groups so users can use it:

```bash
# Find the policy ID
PG_CONTAINER=$(docker ps --filter ancestor=postgres --format "{{.Names}}")
DB_USER=$(docker exec $PG_CONTAINER printenv | grep POSTGRES_USER | cut -d= -f2)
DB_NAME=$(docker exec $PG_CONTAINER psql -U $DB_USER -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'cloudreve%';" | tr -d ' ')
OWNER_ROLE=$(docker exec $PG_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT rolname FROM pg_catalog.pg_roles WHERE rolname LIKE 'cloudreve%';" | tr -d ' ')

# Check current groups and their policies
docker exec $PG_CONTAINER psql -U $OWNER_ROLE -d $DB_NAME \
  -c "SELECT id, name, storage_policy_id FROM groups;"

# Assign OSS policy to Admin group (id=1) and User group (id=2)
docker exec $PG_CONTAINER psql -U $OWNER_ROLE -d $DB_NAME \
  -c "UPDATE groups SET storage_policy_id=3 WHERE id IN (1, 2);"

# Verify
docker exec $PG_CONTAINER psql -U $OWNER_ROLE -d $DB_NAME \
  -c "SELECT id, name, storage_policy_id FROM groups;"
```

> Typical Cloudreve group IDs: Admin=1, User=2, Anonymous=3. Verify with the SELECT query above.

| Issue | Cause | Fix |
|-------|-------|-----|
| `BucketAlreadyExists` | Bucket already exists | Verify via `get_bucket_info()` |
| `AccessDenied` | Invalid AccessKey | Check key permissions |
| Bucket not visible in Cloudreve | Policy not assigned to group | Login to Cloudreve admin → Group → Edit group → Select storage policy |
