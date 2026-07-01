import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import SetupChapter from "../chapters/02-setup/Setup";
import { narrations as setupNarrations } from "../chapters/02-setup/narrations";
import DemoChapter from "../chapters/03-demo/Demo";
import { narrations as demoNarrations } from "../chapters/03-demo/narrations";
import OutroChapter from "../chapters/04-outro/Outro";
import { narrations as outroNarrations } from "../chapters/04-outro/narrations";

export const CHAPTERS: ChapterDef[] = [
  {
    id: "hook",
    title: "开头 + 总览",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "setup",
    title: "注册与令牌",
    narrations: setupNarrations,
    Component: SetupChapter,
  },
  {
    id: "demo",
    title: "软件配置演示",
    narrations: demoNarrations,
    Component: DemoChapter,
  },
  {
    id: "outro",
    title: "结尾",
    narrations: outroNarrations,
    Component: OutroChapter,
  },
];
