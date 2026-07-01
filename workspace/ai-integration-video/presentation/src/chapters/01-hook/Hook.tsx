import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const APPS = [
  { name: "ChatBox", icon: "💬" },
  { name: "Cursor", icon: "⌨️" },
  { name: "VS Code", icon: "🔧" },
  { name: "Python", icon: "🐍" },
  { name: "JetBrains", icon: "🛠️" },
];

export default function Hook({ step }: ChapterStepProps) {
  if (step === 0) return <Step0 />;
  if (step === 1) return <Step1 />;
  return null;
}

function Step0() {
  return (
    <div className="hk-step0">
      <div className="hk-apps-row">
        {APPS.map((app, i) => (
          <div
            key={app.name}
            className="hk-app-card"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <span className="hk-app-icon">{app.icon}</span>
            <span className="hk-app-name">{app.name}</span>
            <div className="hk-app-q">?</div>
          </div>
        ))}
      </div>

      <h1 className="hk-headline">
        每次换软件
        <br />
        都要重新配置？
      </h1>

      {/* Drafting-style underline */}
      <div className="hk-blueprint-line" />

      <p className="hk-sub">API 地址在哪？Key 填哪里？模型名怎么写？</p>
    </div>
  );
}

function Step1() {
  return (
    <div className="hk-step1">
      {/* Big hero number */}
      <div className="hk-hero-row">
        <span className="hk-num hero-num">12</span>
        <span className="hk-num-label">个软件</span>
      </div>

      <div className="hk-blueprint-line hk-blueprint-line--center" />

      <h1 className="hk-solution">一次配好，全部通吃</h1>

      {/* Unified endpoint display */}
      <div className="hk-endpoint">
        <span className="hk-endpoint-label">Base URL</span>
        <code className="hk-endpoint-code">
          https://api.wf1.one/v1
        </code>
      </div>

      {/* Subtle checkmark progression */}
      <div className="hk-check-row">
        {["ChatBox", "Cursor", "VS Code", "Python", "更多..."].map(
          (name, i) => (
            <div
              key={name}
              className="hk-check-item"
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              <svg className="hk-check-icon" viewBox="0 0 24 24" width="18" height="18">
                <path
                  d="M5 13l4 4L19 7"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{name}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
