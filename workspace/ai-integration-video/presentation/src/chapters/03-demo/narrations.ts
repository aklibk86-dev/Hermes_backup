import type { Narration } from "../../registry/types";

export const narrations: Narration[] = [
  // Step 0 — Universal parameters (~12s)
  "有了这三点——Base URL、API Key、模型名——所有软件都只需要配置这三个参数。下面用三个最常见的软件演示一下。",
  // Step 1 — ChatBox (~12s)
  "先说 ChatBox，最好上手的。设置里选 OpenAI API，填上 api.wf1.one/v1，贴上 Key，选个模型。结束。三条信息，三十秒，搞定。",
  // Step 2 — Cursor (~15s)
  "Cursor 稍微不一样。Settings → Models，关上默认的 OpenAI，打开 Override OpenAI Base URL。填同样的地址和 Key。然后在 Model Names 里手动加你想要的模型名。重启一下，完事。",
  // Step 3 — Python (~14s)
  "Python 更简单。pip install openai，然后几行代码：把 base_url 改过来，后面就跟调官方 API 一模一样。支持 stream，体验跟直连没区别。",
];
