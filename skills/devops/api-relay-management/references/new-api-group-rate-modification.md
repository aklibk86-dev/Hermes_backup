# New-API Group Rate Modification (Session Reference)

## Context
WF AI中转站 at api.wf1.one. Upstream cost: 10元 = $20 credit.
Admin user: wufeng, Seller: shop.aklibk.com.

## Initial State
- TopupGroupRatio: `{"default": 2, "svip": 1, "vip": 1.5}`
- Group Ratio (UI): default = 1.0
- Users in "default" group got 2x credits on top-up + consumed at face value = user loses money.

## Changes Made

### 1. TopupGroupRatio (DB direct)
```sql
UPDATE options SET value = '{"default": 1.5, "svip": 1, "vip": 1.5}' WHERE key = 'TopupGroupRatio';
```
Then: `docker restart new-api`

### 2. Group Ratio (UI)
- Console → System → Group & Model Pricing → Group Related Settings
- Changed default group Ratio spinbutton from 1.0 → 1.5

## Verification
```sql
SELECT value FROM options WHERE key = 'TopupGroupRatio';
-- Returns: {"default": 1.5, "svip": 1, "vip": 1.5}
```

## DB Access
- Host: 149.104.8.237 (SSH port 37926, root/ecwoVMLX4252)
- PostgreSQL: container=new-api-postgres, user=newapi, db=new-api
- Password: `docker exec new-api-postgres printenv | grep POSTGRES_PASSWORD`
