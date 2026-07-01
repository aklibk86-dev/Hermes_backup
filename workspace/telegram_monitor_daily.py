#!/usr/bin/env python3
"""
定时任务：每日分析 Telegram 关键词监控数据，更新屏蔽规则
每天执行一次，获取前24小时的关键词命中消息，分析后添加排除规则
"""

import urllib.request, json, base64, sys
from datetime import datetime, timedelta

# === 配置 ===
API_BASE = "http://127.0.0.1:5005"
ADMIN_USER = "admin"
ADMIN_PASS = "tgmonitor2024"
BOT_TOKEN = "8325012304:***"
NOTIFY_CHAT = "8288196655"

# 噪音群组关键词（群名含这些的通常不是目标客户）
NOISE_GROUP_KEYWORDS = [
    "a片", "色情", "av", "黄色", "成人", "porn", "三级", "情色",
    "裸聊", "约炮", "色", "性感", "美女", "直播",
]

# 噪音发送者关键词
NOISE_SENDER_KEYWORDS = [
    "机器人", "bot", "客服", "推广", "广告",
]

def api_login():
    """登录并获取cookie"""
    req = urllib.request.Request(
        f"{API_BASE}/api/auth/login",
        data=json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS}).encode(),
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    return resp.headers.get_all('Set-Cookie') or []

def api_get(url, cookies):
    """GET请求"""
    req = urllib.request.Request(url, headers={"Cookie": "; ".join(cookies)})
    resp = urllib.request.urlopen(req, timeout=10)
    return json.loads(resp.read())

def api_post(url, data, cookies):
    """POST请求"""
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json", "Cookie": "; ".join(cookies)}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    return json.loads(resp.read())

def send_notification(text):
    """通过Bot发通知"""
    try:
        data = json.dumps({"chat_id": NOTIFY_CHAT, "text": text}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=10)
    except:
        pass

def main():
    try:
        # 登录
        cookies = api_login()
        if not cookies:
            send_notification("监控日报：登录失败")
            return
        
        # 获取当前关键词规则
        kws = api_get(f"{API_BASE}/api/keywords", cookies)
        all_rules = kws.get('data', [])
        monitor_rules = [r for r in all_rules if r.get('keywordAction') == 'Monitor' and r.get('isEnabled')]
        exclude_rules = [r for r in all_rules if r.get('keywordAction') == 'Exclude']
        
        monitor_names = {r['id']: r['ruleName'] for r in monitor_rules}
        
        # 获取最近24小时的消息
        msgs = api_get(f"{API_BASE}/api/messages?page=1&pageSize=200", cookies)
        all_msgs = msgs.get('data', {}).get('items', []) if isinstance(msgs.get('data'), dict) else msgs.get('data', [])
        
        if not all_msgs:
            send_notification("监控日报：过去24小时暂无命中消息")
            return
        
        # 分析消息
        now = datetime.utcnow()
        cutoff = now - timedelta(hours=24)
        
        recent_msgs = []
        for m in all_msgs:
            try:
                msg_date = datetime.fromisoformat(m.get('messageDate', '').replace('Z', '+00:00').split('+')[0])
                if msg_date >= cutoff:
                    recent_msgs.append(m)
            except:
                recent_msgs.append(m)
        
        total = len(recent_msgs)
        
        # 按群组统计
        chat_stats = {}
        for m in recent_msgs:
            chat_title = m.get('chatTitle', '未知')
            chat_id = m.get('chatId', 0)
            key = f"{chat_title} ({chat_id})"
            if key not in chat_stats:
                chat_stats[key] = {'count': 0, 'senders': set(), 'messages': []}
            chat_stats[key]['count'] += 1
            chat_stats[key]['senders'].add(m.get('senderTitle', '未知'))
            chat_stats[key]['messages'].append(m.get('text', '')[:100])
        
        # 识别噪音群组
        noisy_chats = {}
        for chat_name, info in sorted(chat_stats.items(), key=lambda x: -x[1]['count']):
            lower_name = chat_name.lower()
            for noise_kw in NOISE_GROUP_KEYWORDS:
                if noise_kw in lower_name:
                    noisy_chats[chat_name] = info
                    break
        
        # 生成报告
        report_lines = []
        report_lines.append(f"Telegram监控日报 ({datetime.now().strftime('%Y-%m-%d')})")
        report_lines.append(f"过去24小时命中: {total} 条消息")
        report_lines.append(f"涉及群组: {len(chat_stats)} 个")
        report_lines.append(f"识别噪音群组: {len(noisy_chats)} 个")
        report_lines.append("")
        
        # Top活跃群组
        report_lines.append("【活跃群组 Top 10】")
        sorted_chats = sorted(chat_stats.items(), key=lambda x: -x[1]['count'])
        for i, (name, info) in enumerate(sorted_chats[:10], 1):
            is_noise = "⚠️" if name in noisy_chats else "✅"
            report_lines.append(f"  {is_noise} {i}. {name[:50]} - {info['count']}条")
        
        report_lines.append("")
        
        # 噪音群组详情
        if noisy_chats:
            report_lines.append("【建议屏蔽的群组(噪音)】")
            for name, info in sorted(noisy_chats.items(), key=lambda x: -x[1]['count']):
                sample = info['messages'][0][:60] if info['messages'] else ""
                report_lines.append(f"  群: {name[:50]}")
                report_lines.append(f"    消息数: {info['count']} | 示例: {sample}")
        
        report_lines.append("")
        report_lines.append("【规则状态】")
        report_lines.append(f"  监控规则: {len(monitor_rules)} 条 (已启用)")
        report_lines.append(f"  排除规则: {len(exclude_rules)} 条")
        
        # 发送报告
        report = "\n".join(report_lines)
        send_notification(report[:4000])
        
        # 自动添加排除规则 - 噪音群组
        added_count = 0
        for chat_name in noisy_chats:
            # 提取群组名（不含chat id）
            clean_name = chat_name.split(" (")[0] if " (" in chat_name else chat_name
            # 检查是否已有排除规则
            already_excluded = False
            for er in exclude_rules:
                if clean_name in (er.get('remark', '') or '') or clean_name in (er.get('keywordValue', '') or '')\
                       or clean_name in (er.get('keywordPattern', '') or ''):
                    already_excluded = True
                    break
            
            if not already_excluded and len(clean_name) > 1:
                # 添加排除规则 - 按群名关键词排除
                payload = {
                    "id": 0, "accountId": None,
                    "ruleName": f"自动排除-{clean_name[:15]}",
                    "keywordValue": clean_name[:30],
                    "matchMode": "Contains",
                    "isMatchUser": False, "userValue": None,
                    "keywordAction": "Exclude",
                    "isCaseSensitive": False, "isEnabled": True,
                    "priority": 20, "remark": f"自动排除噪音群:{clean_name[:30]}"
                }
                try:
                    api_post(f"{API_BASE}/api/keywords", payload, cookies)
                    added_count += 1
                except:
                    pass
        
        if added_count > 0:
            send_notification(f"自动添加了 {added_count} 条排除规则")
        
        print(f"OK: total={total}, noisy={len(noisy_chats)}, excluded_added={added_count}")
        
    except Exception as e:
        error_msg = f"监控日报执行失败: {str(e)[:200]}"
        print(error_msg)
        try:
            send_notification(error_msg)
        except:
            pass

if __name__ == "__main__":
    main()
