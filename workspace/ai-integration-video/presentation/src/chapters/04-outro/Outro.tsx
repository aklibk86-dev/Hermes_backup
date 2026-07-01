import type { ChapterStepProps } from "../../registry/types";
import "./Outro.css";

export default function Outro({ step }: ChapterStepProps) {
  if (step === 0) return <Step0 />;
  if (step === 1) return <Step1 />;
  return null;
}

/* ─── Step 0: More software showcase ─── */
function Step0() {
  const APPS = [
    { name: "LobeChat",  icon: "🧩" },
    { name: "Windsurf",  icon: "🏄" },
    { name: "JetBrains", icon: "🛠️" },
    { name: "NextChat",  icon: "💬" },
    { name: "Obsidian",  icon: "📝" },
    { name: "VS Code",   icon: "🔧" },
    { name: "OpenCat",   icon: "🐱" },
  ];

  return (
    <div className="ou-step0">
      <h2 className="ou-section-title">完整教程还有 9 个软件</h2>

      <div className="ou-apps-grid">
        {APPS.map((app, i) => (
          <div
            key={app.name}
            className="ou-app-card"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="ou-app-icon">{app.icon}</span>
            <span className="ou-app-name">{app.name}</span>
          </div>
        ))}
      </div>

      <div className="ou-divider" />

      <p className="ou-blog-link">
        → 全部教程在博客：<code>blog.aklibk.com</code>
      </p>
    </div>
  );
}

/* ─── Step 1: CTA ─── */
function Step1() {
  return (
    <div className="ou-step1">
      <h1 className="ou-headline">一个中转站配好</h1>
      <h1 className="ou-headline ou-headline--accent">所有软件通吃</h1>

      <div className="ou-cta-card">
        <code className="ou-cta-url">blog.aklibk.com/archives/ai-integration-full-guide</code>
      </div>

      <p className="ou-footer-text">
        评论区聊 👍
      </p>

      <div className="ou-end-mark" />
    </div>
  );
}
