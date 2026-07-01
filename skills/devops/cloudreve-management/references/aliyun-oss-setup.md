# Alibaba Cloud OSS + Cloudreve Setup Reference

Session-derived reference for connecting Cloudreve to Alibaba Cloud OSS (Hong Kong region).

## Prerequisites

- Alibaba Cloud AccessKey with OSS permissions
- Cloudreve instance (v4.16.1) with PostgreSQL
- Python 3 + `oss2` package (`pip install oss2`)

## OSS Bucket Creation

```python
import oss2

access_key_id = "LTAI5t..."
access_key_secret = "ZEKt2D0..."
bucket_name = "cloudreve-aklibk"
endpoint = "oss-cn-hongkong.aliyuncs.com"

auth = oss2.Auth(access_key_id, access_key_secret)
bucket = oss2.Bucket(auth, endpoint, bucket_name)
bucket.create_bucket(oss2.BUCKET_ACL_PRIVATE)

# Verify
info = bucket.get_bucket_info()
print(f"Name: {info.name}, Region: {info.location}")
# acl is an AccessControlList object, not a string
```

## PostgreSQL Configuration

### Discover database

```bash
# Find PG container
docker ps | grep postgresql
# List databases
docker exec 1Panel-postgresql-qqLl psql -U user_k6xnnP -c "\\\\l"
# Find users
docker exec 1Panel-postgresql-qqLl psql -U user_k6xnnP -c "\\\\du"
```

### Query storage policy

```bash
docker exec 1Panel-postgresql-qqLl psql -U cloudreve_QQCPe2 -d cloudreve_7y6xt7 -c "SELECT id, name, type, server, bucket_name, access_key, is_private, settings FROM storage_policies;"
```

### Update bucket name

```sql
UPDATE storage_policies SET bucket_name = 'cloudreve-aklibk' WHERE id = 3;
```

### Assign to user groups

```sql
UPDATE groups SET storage_policy_id = 3 WHERE id = 1;  -- Admin
UPDATE groups SET storage_policy_id = 3 WHERE id = 2;  -- User
```

## Verification

1. Upload test file directly:
```python
bucket.put_object("__test__.txt", b"hello")
bucket.get_object("__test__.txt")
bucket.delete_object("__test__.txt")
```

2. Log in to Cloudreve at https://pan.aklibk.com and upload a file
3. Check OSS bucket in Alibaba Cloud console to confirm file appears

## Key Credentials

- AccessKeyId: LTAI5tAkRu9pTxrXcaM4kKxv
- Endpoint: oss-cn-hongkong.aliyuncs.com
- Bucket: cloudreve-aklibk
- Policy name in Cloudreve: "阿里" (id=3)
