# Token Usage Heatmap Generator

Generate a GitHub-style contribution heatmap from New-API/Xboard cost/amount CSV exports.

## Data Format

Two CSV files exported from the relay backend:
- `cost-YYYY-MM-DD_YYYY-MM-DD.csv` — daily cost by model (columns: user_id, utc_date, model, wallet_type, cost, currency)
- `amount-YYYY-MM-DD_YYYY-MM-DD.csv` — daily token breakdown (columns: user_id, utc_date, model, api_key_name, api_key, type, price, amount)

## Heatmap Types

### Token Heatmap (green)
Cells shaded from #ebedf0 (0) → #216e39 (max), GitHub-contribution style. Each cell's tooltip shows:
- Date, Total tokens, Input(hit), Input(miss), Output, Requests

### Cost Heatmap (orange/red)
Cells shaded from #ebedf0 (¥0) → #d7301f (¥5+). Each cell shows date + cost.

## Implementation Pattern

```python
import csv
from collections import defaultdict
from datetime import datetime, timedelta

# 1. Read CSVs
with open('amount-*.csv', 'r', encoding='utf-8-sig') as f:
    amount_rows = list(csv.DictReader(f))

with open('cost-*.csv', 'r', encoding='utf-8-sig') as f:
    cost_rows = list(csv.DictReader(f))

# 2. Aggregate by date
daily = defaultdict(lambda: {'input_hit': 0, 'input_miss': 0, 'output': 0, 'requests': 0, 'cost': 0.0})
for r in amount_rows:
    t = r['type']
    try: amt = int(float(r['amount']))
    except: amt = 0
    if t == 'input_cache_hit_tokens': daily[r['utc_date']]['input_hit'] += amt
    elif t == 'input_cache_miss_tokens': daily[r['utc_date']]['input_miss'] += amt
    elif t == 'output_tokens': daily[r['utc_date']]['output'] += amt
    elif t == 'request_count': daily[r['utc_date']]['requests'] += amt
for r in cost_rows:
    try: daily[r['utc_date']]['cost'] += float(r['cost'])
    except: pass

# 3. Create full date range (pad empty days)
first = datetime.strptime(sorted_dates[0], '%Y%m%d')
last = datetime.strptime(sorted_dates[-1], '%Y%m%d')
all_dates = [first + timedelta(days=i) for i in range((last-first).days + 1)]

# 4. Group into weeks (Mon-Sun) for heatmap layout
weeks = []
current_week = []
for d in all_dates:
    if d.weekday() == 0 and current_week:
        weeks.append(current_week); current_week = []
    current_week.append(d)
if current_week: weeks.append(current_week)
# Pad first week
while len(weeks[0]) < 7:
    weeks[0].insert(0, weeks[0][0] - timedelta(days=1))

# 5. Color mapping
def token_color(val, max_val):
    ratio = val / max_val if max_val else 0
    if ratio == 0: return '#ebedf0'
    elif ratio < 0.25: return '#9be9a8'
    elif ratio < 0.5: return '#40c463'
    elif ratio < 0.75: return '#30a14e'
    else: return '#216e39'

# 6. Generate HTML table
# For each row (day-of-week 0-6), for each week column, render a cell
```

## Key Analysis Metrics

| Metric | Calculation | Insight |
|--------|-------------|---------|
| Cache hit ratio | `input_hit / (input_hit + input_miss) × 100` | How much input is cached (98%+ = excellent) |
| Avg tokens/request | `total_tokens / total_requests` | Average context size per turn |
| Avg cost/request | `total_cost / total_requests` | Per-turn cost (DeepSeek V4 Flash ≈ ¥0.0056) |
| Weekend vs weekday | Compare avg daily consumption | Personal vs business usage pattern |

## Common Observations

- **Cache ratio >95%** → most sessions reuse large system prompts + conversation history; DeepSeek V4 Flash cache pricing (¥0.05/M vs ¥0.5/M) is the biggest cost driver
- **Weekend usage > weekday** → personal/dev project, not enterprise
- When asked "月套餐¥100" vs actual spending: compare actual monthly cost (~¥65) against plan price to evaluate value

## Sample Stats Card

```
总 Token 消耗: 1,500,837,115
总花费: ¥64.79
总请求数: 11,471
日均 Token: 71,468,434
日均花费: ¥3.09
Cache 命中率: 98.3%
```
