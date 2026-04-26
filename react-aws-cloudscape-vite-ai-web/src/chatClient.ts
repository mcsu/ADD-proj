import type { ChatMessage, ChatSettings } from './types';

interface ChatRequest {
  messages: ChatMessage[];
  settings: ChatSettings;
}

const apiUrl = import.meta.env.VITE_CHAT_API_URL as string | undefined;

export async function sendChatRequest({ messages, settings }: ChatRequest): Promise<string> {
  if (!apiUrl || settings.useMockApi) {
    return createMockReply(messages, settings);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
      model: settings.modelId,
      temperature: settings.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI service returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    message?: string;
    reply?: string;
    content?: string;
  };

  const reply = payload.message ?? payload.reply ?? payload.content;
  if (!reply) {
    throw new Error('AI service response did not include message, reply, or content');
  }

  return reply;
}

async function createMockReply(messages: ChatMessage[], settings: ChatSettings): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  await new Promise((resolve) => window.setTimeout(resolve, 700));

  if (!lastUserMessage) {
    return '你好，我已经准备好了。你可以告诉我想设计的聊天流程、模型接入方式或页面风格。';
  }

  const topic = lastUserMessage.content.trim();
  return [
    `我收到了你的问题：“${topic}”。`,
    `当前使用 ${settings.modelId}，温度 ${settings.temperature.toFixed(1)}。`,
    '这是本地模拟回复。配置 VITE_CHAT_API_URL 后，前端会把会话消息发送到你的后端 AI 网关。',
  ].join('\n\n');
}
