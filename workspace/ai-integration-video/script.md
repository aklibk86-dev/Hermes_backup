你在用一个 API 中转站，但每次换软件都要重新找设置在哪，对吧？今天这个视频，我把 12 个软件的配置方法全给你理顺了。一次配好，所有软件通吃。

---

中转站就一个地址：api.wf1.one。Base URL 加个 /v1，就是万能钥匙。

---

支持的模型，从 GPT、Claude 到 DeepSeek，基本你能想到的都有。价格去定价页面看一眼，不贵。

---

第一步，注册。打开 api.wf1.one，点 Sign up，填用户名、邮箱、密码。

有一条一定要记住：账户名和密码，丢了找不回来。建议直接存密码管理器。

---

注册完登录进去。先去「钱包」→「充值」，到 shop.aklibk.com 买个兑换码。

输入兑换码，额度秒到账。

---

然后去「令牌管理」→「添加令牌」。名字随便写，过期时间默认永久就行。

创建完立刻复制那个 sk-xxx，页面关了你就再也看不到了。

---

有了这三点——Base URL、API Key、模型名——所有软件都只需要配置这三个参数。

下面用三个最常见的软件演示一下。

---

先说 ChatBox，最好上手的。设置里选 OpenAI API，填上 api.wf1.one/v1，贴上 Key，选个模型。结束。

三条信息，三十秒，搞定。

---

Cursor 稍微不一样。Settings → Models，关上默认的 OpenAI，打开 Override OpenAI Base URL。填同样的地址和 Key。

然后在 Model Names 里手动加你想要的模型名。重启一下，完事。

---

Python 更简单。pip install openai，然后几行代码：

from openai import OpenAI
client = OpenAI(base_url="https://api.wf1.one/v1", api_key="你的 sk-xxx")

后面就跟调官方 API 一模一样。支持 stream，体验跟直连没区别。

---

还有 LobeChat、Windsurf、JetBrains、NextChat、Obsidian……整整 12 个软件的配置方法，全部写在那篇教程里了。

链接放在博客，评论区也有。

---

所以你看，一个中转站配好，所有软件就都能用了。省钱省事。

博客链接在下面，有什么问题评论区聊。
