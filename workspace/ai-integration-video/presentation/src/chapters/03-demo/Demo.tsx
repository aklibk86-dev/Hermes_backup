import type { ChapterStepProps } from "../../registry/types";
import "./Demo.css";

export default function Demo({ step }: ChapterStepProps) {
  if (step === 0) return <Step0 />;
  if (step === 1) return <Step1 />;
  if (step === 2) return <Step2 />;
  if (step === 3) return <Step3 />;
  return null;
}

/* ─── Step 0: Three universal parameters ─── */
function Step0() {
  return (
    <div className="de-step0">
      <h2 className="de-section-title">所有软件只需要三个参数</h2>

      <div className="de-formula">
        <div className="de-formula-item">
          <span className="de-formula-icon">🔗</span>
          <span className="de-formula-label">Base URL</span>
          <code className="de-formula-value">api.wf1.one/v1</code>
        </div>
        <div className="de-formula-plus">+</div>
        <div className="de-formula-item">
          <span className="de-formula-icon">🔑</span>
          <span className="de-formula-label">API Key</span>
          <code className="de-formula-value">sk-xxx...xxx</code>
        </div>
        <div className="de-formula-plus">+</div>
        <div className="de-formula-item">
          <span className="de-formula-icon">🧠</span>
          <span className="de-formula-label">模型名</span>
          <code className="de-formula-value">claude-sonnet-4</code>
        </div>
      </div>

      <p className="de-annotation">下面用三个最常见的软件演示一下</p>
    </div>
  );
}

/* ─── Step 1: ChatBox configuration ─── */
function Step1() {
  return (
    <div className="de-step1">
      <h2 className="de-section-title">ChatBox 配置</h2>

      <div className="de-panel">
        <div className="de-panel-header">
          <span>模型提供商设置</span>
        </div>

        <div className="de-panel-body">
          <div className="de-panel-row">
            <span className="de-row-label">提供商</span>
            <div className="de-row-value">
              <span className="de-tag">OpenAI 兼容</span>
            </div>
          </div>
          <div className="de-panel-row">
            <span className="de-row-label">Base URL</span>
            <div className="de-row-value de-row-value--code de-row-value--accent">
              https://api.wf1.one/v1
            </div>
          </div>
          <div className="de-panel-row">
            <span className="de-row-label">API Key</span>
            <div className="de-row-value de-row-value--code">
              sk-xxx...xxxx
            </div>
          </div>
          <div className="de-panel-row">
            <span className="de-row-label">模型</span>
            <div className="de-row-value">
              <span className="de-tag de-tag--accent">claude-sonnet-4</span>
            </div>
          </div>
        </div>
      </div>

      <p className="de-annotation">⏺ 填好后保存，就能直接对话了。三条信息，三十秒搞定</p>
    </div>
  );
}

/* ─── Step 2: Cursor configuration ─── */
function Step2() {
  return (
    <div className="de-step2">
      <h2 className="de-section-title">Cursor 配置</h2>

      <div className="de-panel de-panel--wide">
        <div className="de-cursor-layout">
          <div className="de-cursor-sidebar">
            <div className="de-cursor-search">
              <span>🔍</span>
              <span>搜索设置...</span>
            </div>
            <div className="de-cursor-menu">
              {["General", "Account", "Models", "Editor"].map((item, i) => (
                <div
                  key={item}
                  className={`de-cursor-menu-item ${item === "Models" ? "de-cursor-menu-item--active" : ""}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="de-cursor-content">
            <div className="de-cursor-section">
              <span className="de-cursor-section-title">OpenAI API</span>
            </div>

            <div className="de-panel-body">
              <div className="de-panel-row">
                <span className="de-row-label">Override Base URL</span>
                <div className="de-row-value">
                  <span className="de-toggle de-toggle--on">ON</span>
                </div>
              </div>
              <div className="de-panel-row">
                <span className="de-row-label">Base URL</span>
                <div className="de-row-value de-row-value--code de-row-value--accent">
                  https://api.wf1.one/v1
                </div>
              </div>
              <div className="de-panel-row">
                <span className="de-row-label">API Key</span>
                <div className="de-row-value de-row-value--code">
                  sk-xxx...xxxx
                </div>
              </div>
              <div className="de-panel-row">
                <span className="de-row-label">Model Names</span>
                <div className="de-row-value">
                  <span className="de-tag de-tag--accent">+ claude-sonnet-4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="de-annotation">⏺ 打开 Override，填好地址和 Key，手动加模型名，重启就生效</p>
    </div>
  );
}

/* ─── Step 3: Python configuration ─── */
function Step3() {
  return (
    <div className="de-step3">
      <h2 className="de-section-title">Python OpenAI SDK</h2>

      <div className="de-editor">
        <div className="de-editor-bar">
          <span className="de-editor-filename">config.py</span>
        </div>
        <pre className="de-editor-content"><code>{`from openai import OpenAI

client = OpenAI(
    base_url="https://api.wf1.one/v1",
    api_key="sk-xxx...xxxx"
)

response = client.chat.completions.create(
    model="claude-sonnet-4",
    messages=[{"role": "user", "content": "Hello"}]
)

print(response.choices[0].message.content)`}</code></pre>
      </div>

      <p className="de-annotation">⏺ pip install openai，改 base_url，其余代码不变。支持 stream，体验跟直连没区别</p>
    </div>
  );
}
