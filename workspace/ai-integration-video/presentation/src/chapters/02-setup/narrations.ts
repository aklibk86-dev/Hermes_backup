import type { Narration } from "../../registry/types";

export const narrations: Narration[] = [
  // Step 0 — Model list (~12s)
  "支持的模型，从 GPT、Claude 到 DeepSeek，基本你能想到的都有。价格去定价页面看一眼，不贵。",
  // Step 1 — Registration (~14s)
  "第一步，注册。打开 api.wf1.one，点 Sign up，填用户名、邮箱、密码。有一条一定要记住：账户名和密码，丢了找不回来。建议直接存密码管理器。",
  // Step 2 — Recharge (~14s)
  "注册完登录进去。先去「钱包」→「充值」，到 shop.aklibk.com 买个兑换码。输入兑换码，额度秒到账。",
  // Step 3 — Token creation (~15s)
  "然后去「令牌管理」→「添加令牌」。名字随便写，过期时间默认永久就行。创建完立刻复制那个 sk-xxx，页面关了你就再也看不到了。",
];
