import type { ChapterStepProps } from "../../registry/types";
import "./Setup.css";

export default function Setup({ step }: ChapterStepProps) {
  if (step === 0) return <Step0 />;
  if (step === 1) return <Step1 />;
  if (step === 2) return <Step2 />;
  if (step === 3) return <Step3 />;
  return null;
}

/* ─── Step 0: Model list showcase ─── */
function Step0() {
  const MODELS = [
    { name: "claude-sonnet-4",      provider: "Anthropic",   badge: "推荐" },
    { name: "claude-haiku-4",       provider: "Anthropic",   badge: "" },
    { name: "gpt-4o",               provider: "OpenAI",      badge: "热门" },
    { name: "gpt-4o-mini",          provider: "OpenAI",      badge: "" },
    { name: "deepseek-v4",          provider: "DeepSeek",    badge: "" },
    { name: "gemini-2.5-flash",     provider: "Google",      badge: "" },
  ];

  return (
    <div className="su-step0">
      <h2 className="su-section-title">支持的模型</h2>
      <p className="su-lead">GPT · Claude · DeepSeek · Gemini …… 你要的都有</p>

      <div className="su-model-list">
        {MODELS.map((m, i) => (
          <div
            key={m.name}
            className="su-model-chip"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="su-model-chip-name">{m.name}</span>
            <span className="su-model-chip-provider">{m.provider}</span>
            {m.badge && <span className="su-model-chip-badge">{m.badge}</span>}
          </div>
        ))}
      </div>

      <p className="su-footnote">价格去定价页面看一眼 —— 不贵</p>
    </div>
  );
}

/* ─── Step 1: Registration flow ─── */
function Step1() {
  return (
    <div className="su-step1">
      <h2 className="su-section-title">注册</h2>

      <div className="su-browser">
        <div className="su-browser-bar">
          <div className="su-browser-dots">
            <span className="su-dot su-dot--red" />
            <span className="su-dot su-dot--yellow" />
            <span className="su-dot su-dot--green" />
          </div>
          <div className="su-browser-url">
            <span className="su-url-lock">🔒</span>
            <span>api.wf1.one</span>
          </div>
        </div>

        <div className="su-signup-flow">
          <div className="su-signup-card">
            <h3 className="su-signup-title">Sign up</h3>
            <div className="su-signup-field">
              <span className="su-signup-label">用户名</span>
              <div className="su-signup-input"><span className="su-cursor">|</span></div>
            </div>
            <div className="su-signup-field">
              <span className="su-signup-label">邮箱</span>
              <div className="su-signup-input"><span className="su-cursor">|</span></div>
            </div>
            <div className="su-signup-field">
              <span className="su-signup-label">密码</span>
              <div className="su-signup-input"><span>••••••••</span></div>
            </div>
            <div className="su-signup-btn">创建账户</div>
          </div>
        </div>
      </div>

      <div className="su-warning">
        <span className="su-warning-icon">⚠</span>
        <span>账户名和密码丢了找不回来，建议直接存密码管理器</span>
      </div>
    </div>
  );
}

/* ─── Step 2: Recharge ─── */
function Step2() {
  return (
    <div className="su-step2">
      <h2 className="su-section-title">充值</h2>

      <div className="su-recharge-flow">
        {/* Step A: Go to wallet */}
        <div className="su-recharge-card">
          <div className="su-recharge-num">1</div>
          <div className="su-recharge-icon">👛</div>
          <span className="su-recharge-text">「钱包」→「充值」</span>
        </div>

        <div className="su-arrow">→</div>

        {/* Step B: Get code */}
        <div className="su-recharge-card">
          <div className="su-recharge-num">2</div>
          <div className="su-recharge-icon">🏪</div>
          <span className="su-recharge-text">shop.aklibk.com 买兑换码</span>
        </div>

        <div className="su-arrow">→</div>

        {/* Step C: Enter code */}
        <div className="su-recharge-card su-recharge-card--active">
          <div className="su-recharge-num">3</div>
          <div className="su-recharge-icon">🔑</div>
          <span className="su-recharge-text">输入兑换码</span>
          <div className="su-recharge-code-input">XXXX-XXXX-XXXX</div>
        </div>
      </div>

      <div className="su-recharge-result">
        ✅ 额度秒到账，立即可用
      </div>
    </div>
  );
}

/* ─── Step 3: Token creation ─── */
function Step3() {
  return (
    <div className="su-step3">
      <h2 className="su-section-title">创建令牌</h2>

      <div className="su-token-panel">
        <div className="su-token-header">
          <span>令牌管理</span>
          <div className="su-token-add-btn">+ 添加令牌</div>
        </div>

        <div className="su-token-body">
          <div className="su-token-field">
            <span className="su-token-label">名称</span>
            <div className="su-token-input su-token-input--filled">
              <span>我的 API Key</span>
              <span className="su-cursor">|</span>
            </div>
          </div>
          <div className="su-token-field">
            <span className="su-token-label">过期时间</span>
            <div className="su-token-input su-token-input--filled">
              <span>永久（推荐）</span>
            </div>
          </div>

          <div className="su-key-display">
            <span className="su-key-display-label">密钥</span>
            <div className="su-key-display-value">
              <code>sk-xxx...xxxx</code>
              <span className="su-key-copy-btn">📋</span>
            </div>
          </div>
        </div>
      </div>

      <div className="su-urgent-note">
        <span className="su-urgent-icon">⏺</span>
        <span>创建完立刻复制！页面关了你就再也看不到了</span>
      </div>
    </div>
  );
}
