# Cloudscape AI Chat

React + Vite + AWS Cloudscape 实现的 AI 聊天机器人 Web 应用。

## 功能

- Cloudscape `AppLayout`、`TopNavigation`、`SideNavigation` 和 `HelpPanel` 应用框架
- 多会话侧栏、会话重命名、清空上下文
- 消息输入、发送中状态、错误提示、自动滚动
- 模型、温度和 Mock/Live API 设置
- `localStorage` 持久化会话和设置

## 启动

```bash
npm install
npm run dev
```

默认地址：

```text
http://127.0.0.1:5173/
```

## 接入真实 AI 后端

前端不会直接保存模型密钥。建议用一个后端代理接 OpenAI、Amazon Bedrock 或自己的模型服务。

创建 `.env.local`：

```text
VITE_CHAT_API_URL=http://127.0.0.1:8787/api/chat
```

然后在页面右侧设置里关闭“使用本地模拟回复”。

前端会发送：

```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "model": "amazon-bedrock-claude-3-5-sonnet",
  "temperature": 0.7
}
```

后端返回以下任一字段即可：

```json
{ "reply": "你好，有什么可以帮你？" }
```

也支持 `message` 或 `content` 字段。
