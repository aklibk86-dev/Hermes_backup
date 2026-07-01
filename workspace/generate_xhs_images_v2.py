"""
小红书图文笔记生成器 v2
依赖：pip install Pillow
输出：6 张 1080×1440 PNG 图片

使用方法：
  1. 修改下方 CONTENT_CONFIG 字典里的文字内容
  2. 运行 python generate_xhs_images_v2.py
  3. 检查 xhs_output/ 目录下的 6 张图
"""

from PIL import Image, ImageDraw, ImageFont
import os, textwrap

OUTPUT_DIR = "xhs_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

W, H = 1080, 1440  # 小红书 3:4

# ===== 颜色系统 =====
PINK      = (255, 220, 230)
PEACH     = (255, 235, 220)
MINT      = (220, 245, 235)
LAVENDER  = (235, 225, 255)
SKY       = (220, 235, 255)
CREAM     = (255, 250, 240)

PINK_DARK      = (220, 100, 130)
PEACH_DARK     = (210, 140, 90)
MINT_DARK      = (80, 180, 140)
LAVENDER_DARK  = (140, 100, 200)
SKY_DARK       = (90, 150, 210)

TEXT_MAIN = (80, 60, 70)
TEXT_SUB  = (140, 120, 130)
WHITE     = (255, 255, 255)

# ===== 内容配置（改这里即可换主题）=====
CONTENT_CONFIG = {
    # ---- 封面 ----
    "cover_title1": "国内用 GPT-4o",
    "cover_title2": "完整教程来啦",
    "cover_tags": ["国内直接可用", "3分钟搞定", "保姆级教程"],
    "cover_sub1": "亲测有效！建议收藏慢慢看",
    "cover_sub2": "踩过无数坑之后的总结",
    "cover_signature": "一枚 AI 工具爱好者 ✦ 持续分享",

    # ---- 引言/痛点 ----
    "intro_questions": [
        "想用 ChatGPT/GPT-4o 但没境外卡？😫",
        "找了一圈中转站，怕被坑怕跑路？",
        "API 配置搞不懂，网上教程一堆废话？",
    ],
    "intro_selling_point": "WF API中转站 · 国内直接用的 AI 接口\n稳定运营 · 即买即用 · 新手友好",

    # ---- 步骤页 1 ----
    "step1_title": "Step 1 · 注册账号",
    "step1_items": [
        "打开 api.wf1.one，点击注册",
        "用邮箱注册，收验证码激活",
        "登录后进入控制台，查看你的 API Key",
    ],
    "step1_tip": "💡 注册后建议立即绑定 Telegram，方便接收通知",

    # ---- 步骤页 2 ----
    "step2_title": "Step 2 · 购买余额",
    "step2_items": [
        "访问 shop.aklibk.com 选购兑换码",
        "支持支付宝/微信支付，支付后自动到账",
        "在控制台输入兑换码，余额秒到",
    ],
    "step2_tip": "💡 新用户推荐从 20刀 入门，够用一阵子了",

    # ---- 步骤页 3（含代码风格）----
    "step3_title": "Step 3 · 对接使用",
    "step3_code_mode": True,
    "step3_items_intro": "在 OpenAI 官方客户端、Cursor、ChatBox 中，填入以下信息即可：",
    "step3_code_lines": [
        "请求地址：https://api.wf1.one/v1",
        "API Key：你的密钥（控制台获取）",
        "模型列表：GPT-4o / Claude 3.5 Sonnet",
        "          / Gemini 1.5 Pro / DeepSeek",
        "",
        "支持 OpenAI SDK 全家桶：",
        "  openai==> 改 base_url 即可",
        "  Python / JS / curl / 全兼容",
    ],
    "step3_tip": "💡 详细教程看这里 → blog.aklibk.com",

    # ---- 引导 ----
    "cta_package_title": "🎁 新手资料包清单",
    "cta_items": [
        ("《API 接入速查表》", MINT, MINT_DARK),
        ("《各大模型对比》", PINK, PINK_DARK),
        ("《常见报错解决》", LAVENDER, LAVENDER_DARK),
        ("《余额管理技巧》", SKY, SKY_DARK),
        ("《推荐工具清单》", PEACH, PEACH_DARK),
    ],
    "cta_body": "资料包整理好了，私信我暗号「教程」\n自动发你！无需转发，无套路 🤝",
    "cta_footer": "👍 点赞 ⭐ 收藏 💬 评论「求教程」\n关注我，持续分享 AI 干货",
}


# ===== 字体（跨平台自动适配）=====
def get_font(size):
    """查找系统可用中文字体"""
    font_paths = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                pass
    return ImageFont.load_default()


# ===== 工具函数 =====
def draw_card(draw, xy, radius, fill, outline=None, ow=2):
    """画圆角矩形卡片"""
    if outline:
        draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=ow)
    else:
        draw.rounded_rectangle(xy, radius=radius, fill=fill)


def draw_blobs(draw, colors=None):
    """画装饰椭圆色块"""
    if colors is None:
        colors = [PINK, LAVENDER, PEACH, MINT]
    blobs = [
        ((-100, -200, 500, 300), colors[0]),
        ((600, -100, 1200, 400), colors[1]),
        ((200, 1000, 900, 1500), colors[2]),
        ((700, 1100, 1200, 1600), colors[3]),
    ]
    for pos, col in blobs:
        draw.ellipse(pos, fill=col)


def make_soft_overlay(img):
    """添加半透明白色遮罩柔化"""
    overlay = Image.new("RGBA", (W, H), (255, 255, 255, 200))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    return ImageDraw.Draw(img)


def wrap_text(text, font, max_width, draw):
    """自动换行：将文本按最大宽度切分为多行"""
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        # 检查是否整段能放下
        _, _, tw, _ = draw.textbbox((0, 0), paragraph, font=font)
        if tw <= max_width:
            lines.append(paragraph)
        else:
            words = list(paragraph)  # 按字符切分（中文适用）
            current = ""
            for ch in words:
                test = current + ch
                _, _, tw, _ = draw.textbbox((0, 0), test, font=font)
                if tw <= max_width:
                    current = test
                else:
                    if current:
                        lines.append(current)
                    current = ch
            if current:
                lines.append(current)
    return lines


def draw_centered_text(draw, text, x, y, font, fill, max_width, line_height=None, anchor=None):
    """居中绘制多行文本"""
    if line_height is None:
        line_height = font.size + 10
    lines = wrap_text(text, font, max_width, draw)
    total_h = len(lines) * line_height
    start_y = y - total_h // 2
    for i, line in enumerate(lines):
        if anchor == "mm":
            _, _, tw, _ = draw.textbbox((0, 0), line, font=font)
            draw.text((x - tw // 2, start_y + i * line_height), line, font=font, fill=fill)
        else:
            draw.text((x, start_y + i * line_height), line, font=font, fill=fill)
    return start_y + len(lines) * line_height


# ===== 各页生成函数 =====

def make_cover(cfg):
    """图1：封面页"""
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)
    draw_blobs(draw)
    draw = make_soft_overlay(img)

    f_big = get_font(72)
    f_sub = get_font(36)
    f_tag = get_font(28)
    f_sig = get_font(26)

    # 白色主卡片
    draw_card(draw, [60, 220, W - 60, 1100], 36, WHITE, PINK_DARK, 2)

    # 主标题
    draw.text((W // 2, 360), cfg["cover_title1"], font=f_big, fill=PINK_DARK, anchor="mm")
    draw.text((W // 2, 450), cfg["cover_title2"], font=f_big, fill=TEXT_MAIN, anchor="mm")

    # 分割线
    draw.line([(220, 520), (W - 220, 520)], fill=PEACH_DARK, width=2)

    # 标签
    tag_colors = [(MINT, MINT_DARK), (PEACH, PEACH_DARK), (SKY, SKY_DARK)]
    tags = cfg["cover_tags"]
    total_tags_w = len(tags) * 260 + (len(tags) - 1) * 20
    start_x = (W - total_tags_w) // 2
    for i, txt in enumerate(tags):
        bg, fc = tag_colors[i % 3]
        bx = start_x + i * 280
        draw_card(draw, [bx, 560, bx + 260, 630], 18, bg, fc, 1)
        draw.text((bx + 130, 595), txt, font=f_tag, fill=fc, anchor="mm")

    # 底部信息
    draw.text((W // 2, 700), cfg["cover_sub1"], font=f_sub, fill=TEXT_SUB, anchor="mm")
    draw.text((W // 2, 750), cfg["cover_sub2"], font=f_sub, fill=TEXT_SUB, anchor="mm")
    draw.text((W // 2, 1020), cfg["cover_signature"], font=f_sig, fill=TEXT_SUB, anchor="mm")

    img.save(f"{OUTPUT_DIR}/01_封面.png", quality=95)
    print("✅ 图1: 封面")


def make_intro(cfg):
    """图2：引言/痛点"""
    img = Image.new("RGB", (W, H), LAVENDER)
    draw = ImageDraw.Draw(img)
    draw_blobs(draw, [PINK, SKY, MINT, PEACH])
    draw = make_soft_overlay(img)

    f_q = get_font(34)
    f_sp = get_font(36)
    f_title = get_font(48)

    # 标题
    draw.text((W // 2, 120), "🤔 你是不是也有这些烦恼？", font=f_title, fill=PINK_DARK, anchor="mm")

    # 问题气泡卡片
    questions = cfg["intro_questions"]
    card_colors = [PINK, SKY, MINT]
    for i, q in enumerate(questions):
        y0 = 220 + i * 200
        bg = card_colors[i % 3]
        draw_card(draw, [80, y0, W - 80, y0 + 150], 24, bg, TEXT_SUB, 1)
        draw_centered_text(draw, q, W // 2, y0 + 75, f_q, TEXT_MAIN, 800, anchor="mm")

    # 核心卖点卡片
    y_sp = 220 + len(questions) * 200 + 60
    draw_card(draw, [60, y_sp, W - 60, y_sp + 200], 28, WHITE, PINK_DARK, 2)
    draw_centered_text(draw, cfg["intro_selling_point"], W // 2, y_sp + 100, f_sp, PINK_DARK, 900, anchor="mm")

    img.save(f"{OUTPUT_DIR}/02_引言.png", quality=95)
    print("✅ 图2: 引言/痛点")


def make_step_page(cfg, page_num, title_key, items_key, tip_key, bg_color, accent_color):
    """图3-5：步骤页通用"""
    img = Image.new("RGB", (W, H), bg_color)
    draw = ImageDraw.Draw(img)
    draw_blobs(draw, [MINT, PINK, SKY, LAVENDER])
    draw = make_soft_overlay(img)

    f_title = get_font(42)
    f_item = get_font(32)
    f_tip = get_font(30)
    f_num = get_font(36)

    title = cfg[title_key]
    items = cfg[items_key]
    tip = cfg[tip_key]

    # 步骤横幅
    draw_card(draw, [60, 80, W - 60, 160], 20, accent_color, WHITE, 2)
    draw.text((W // 2, 120), title, font=f_title, fill=WHITE, anchor="mm")

    # 步骤卡片
    for i, item in enumerate(items):
        y0 = 220 + i * 200
        # 序号圆圈
        cx, cy = 130, y0 + 55
        draw.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=accent_color)
        draw.text((cx, cy), str(i + 1), font=f_num, fill=WHITE, anchor="mm")

        # 卡片
        draw_card(draw, [180, y0, W - 80, y0 + 110], 20, WHITE, accent_color, 1)
        draw_centered_text(draw, item, 190, y0 + 15, f_item, TEXT_MAIN, 780)

    # 提示
    if tip:
        y_tip = 220 + len(items) * 200 + 40
        draw_card(draw, [80, y_tip, W - 80, y_tip + 80], 18, PEACH, PEACH_DARK, 1)
        draw.text((W // 2, y_tip + 40), tip, font=f_tip, fill=PEACH_DARK, anchor="mm")

    # 页码标识
    draw.text((W // 2, H - 60), f"{page_num} / 6", font=get_font(22), fill=TEXT_SUB, anchor="mm")

    img.save(f"{OUTPUT_DIR}/0{page_num}_{title.split('·')[0].strip()}.png", quality=95)
    print(f"✅ 图{page_num}: {title}")


def make_step3_code(cfg):
    """图5：步骤3 - 含代码编辑器风格"""
    img = Image.new("RGB", (W, H), MINT)
    draw = ImageDraw.Draw(img)
    draw_blobs(draw, [SKY, LAVENDER, PINK, PEACH])
    draw = make_soft_overlay(img)

    f_title = get_font(42)
    f_intro = get_font(30)
    f_code = get_font(26)
    f_tip = get_font(30)

    title = cfg["step3_title"]
    intro = cfg["step3_items_intro"]
    code_lines = cfg["step3_code_lines"]
    tip = cfg["step3_tip"]

    # 步骤横幅
    draw_card(draw, [60, 80, W - 60, 160], 20, MINT_DARK, WHITE, 2)
    draw.text((W // 2, 120), title, font=f_title, fill=WHITE, anchor="mm")

    # 介绍文字
    draw.text((W // 2, 210), intro, font=f_intro, fill=TEXT_MAIN, anchor="mm")

    # 代码编辑器区域
    code_bg = (40, 44, 52)
    code_y0 = 260
    code_h = 40 + len(code_lines) * 42
    draw_card(draw, [80, code_y0, W - 80, code_y0 + code_h], 16, code_bg)

    # 代码行
    code_colors = [(150, 220, 150), (200, 200, 200), (180, 180, 220), (220, 200, 150)]
    for i, line in enumerate(code_lines):
        if line.startswith("  "):
            # 缩进行
            color = code_colors[min(i, len(code_colors) - 1)]
        elif not line.strip():
            color = code_bg  # 空行透明
        elif "：：" in line or "==>" in line:
            color = (150, 220, 150)  # 绿色注释
        elif "→" in line:
            color = (150, 180, 255)  # 蓝色箭头
        else:
            color = code_colors[i % len(code_colors)]
        draw.text((120, code_y0 + 30 + i * 42), line, font=f_code, fill=color)

    # 提示
    y_tip = code_y0 + code_h + 40
    draw_card(draw, [80, y_tip, W - 80, y_tip + 80], 18, PEACH, PEACH_DARK, 1)
    draw.text((W // 2, y_tip + 40), tip, font=f_tip, fill=PEACH_DARK, anchor="mm")

    # 页码
    draw.text((W // 2, H - 60), "5 / 6", font=get_font(22), fill=TEXT_SUB, anchor="mm")

    img.save(f"{OUTPUT_DIR}/05_步骤3_对接使用.png", quality=95)
    print("✅ 图5: 步骤3_对接使用")


def make_cta(cfg):
    """图6：引导私信"""
    img = Image.new("RGB", (W, H), PEACH)
    draw = ImageDraw.Draw(img)
    draw_blobs(draw, [LAVENDER, MINT, PINK, SKY])
    draw = make_soft_overlay(img)

    f_title = get_font(44)
    f_item = get_font(28)
    f_body = get_font(34)
    f_footer = get_font(30)

    # 标题
    draw.text((W // 2, 100), cfg["cta_package_title"], font=f_title, fill=PINK_DARK, anchor="mm")

    # 资料包清单
    items = cfg["cta_items"]
    for i, (txt, bg, fc) in enumerate(items):
        y0 = 180 + i * 120
        draw_card(draw, [100, y0, W - 100, y0 + 90], 20, bg, fc, 1)
        draw.text((W // 2, y0 + 45), txt, font=f_item, fill=fc, anchor="mm")

    # 引导话术卡片
    y_body = 180 + len(items) * 120 + 50
    draw_card(draw, [60, y_body, W - 60, y_body + 200], 28, WHITE, PINK_DARK, 2)
    draw_centered_text(draw, cfg["cta_body"], W // 2, y_body + 100, f_body, TEXT_MAIN, 900, anchor="mm")

    # 底部
    y_footer = y_body + 240
    draw_centered_text(draw, cfg["cta_footer"], W // 2, y_footer, f_footer, PINK_DARK, 900, anchor="mm")

    draw.text((W // 2, H - 60), "6 / 6", font=get_font(22), fill=TEXT_SUB, anchor="mm")

    img.save(f"{OUTPUT_DIR}/06_引导私信.png", quality=95)
    print("✅ 图6: 引导私信")


# ===== 主入口 =====
def generate_all(cfg=None):
    """生成全部 6 张图"""
    if cfg is None:
        cfg = CONTENT_CONFIG

    make_cover(cfg)
    make_intro(cfg)
    make_step_page(cfg, 3, "step1_title", "step1_items", "step1_tip", SKY, SKY_DARK)
    make_step_page(cfg, 4, "step2_title", "step2_items", "step2_tip", LAVENDER, LAVENDER_DARK)
    make_step3_code(cfg)
    make_cta(cfg)

    print(f"\n🎉 全部完成！6 张图已保存到 {OUTPUT_DIR}/")


if __name__ == "__main__":
    generate_all()
