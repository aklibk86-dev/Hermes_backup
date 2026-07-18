#!/bin/bash
# ============================================================
# Hermes Agent 自动备份脚本
# 每天定时运行，备份到 GitHub Hermes_backup 仓库
# ============================================================
set -e

BACKUP_DIR="/opt/data/hermes-backup"
HERMES_DIR="/opt/data/.hermes"
SKILLS_DIR="/opt/data/skills"
LOGS_DIR="/opt/data/logs"
MEMORIES_DIR="/opt/data/memories"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 开始备份..."

# 进入备份目录
cd "$BACKUP_DIR"

# 拉取最新变更（避免冲突）
git pull --rebase origin main 2>/dev/null || true

# 清空并重新复制
rm -rf config skills logs memories

# 复制 Hermes 配置（除了 session DB 等大文件）
mkdir -p config
cp -r "$HERMES_DIR"/* config/ 2>/dev/null || true
rm -f config/sessions.db 2>/dev/null || true

# 复制 skills
cp -r "$SKILLS_DIR" skills/

# 复制 logs（只保留最近 7 天）
mkdir -p logs
find "$LOGS_DIR" -name "*.log" -mtime -7 -exec cp {} logs/ \; 2>/dev/null || true

# 复制 memories
if [ -d "$MEMORIES_DIR" ]; then
    cp -r "$MEMORIES_DIR" memories/
fi

# 生成备份清单
cat > BACKUP_MANIFEST.md << 'EOF'
# Hermes 备份清单

## 上次备份时间
EOF
echo "$DATE" >> BACKUP_MANIFEST.md
echo "" >> BACKUP_MANIFEST.md
echo "## 文件统计" >> BACKUP_MANIFEST.md
echo "- Config: $(find config -type f | wc -l) 个文件" >> BACKUP_MANIFEST.md
echo "- Skills: $(find skills -type f | wc -l) 个文件" >> BACKUP_MANIFEST.md
echo "- Logs: $(find logs -type f | wc -l) 个文件" >> BACKUP_MANIFEST.md
echo "- Memories: $(find memories -type f | wc -l) 个文件" >> BACKUP_MANIFEST.md

# Git 提交
git add -A
if ! git diff --cached --quiet; then
    git commit -m "auto-backup $DATE"
    git push origin main
    echo "[$DATE] ✅ 备份完成并推送成功"
else
    echo "[$DATE] 📭 无变更，跳过提交"
fi
