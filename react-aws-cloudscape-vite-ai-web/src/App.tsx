import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppLayout,
  Badge,
  Box,
  Button,
  Container,
  ContentLayout,
  Flashbar,
  FormField,
  Header,
  HelpPanel,
  Link,
  Select,
  SideNavigation,
  Slider,
  SpaceBetween,
  Spinner,
  Textarea,
  Toggle,
  TopNavigation,
} from '@cloudscape-design/components';
import type { FlashbarProps, SideNavigationProps } from '@cloudscape-design/components';
import { sendChatRequest } from './chatClient';
import {
  loadActiveSessionId,
  loadSessions,
  loadSettings,
  saveActiveSessionId,
  saveSessions,
  saveSettings,
} from './storage';
import type { ChatMessage, ChatSession, ChatSettings } from './types';

const defaultSettings: ChatSettings = {
  modelId: 'amazon-bedrock-claude-3-5-sonnet',
  temperature: 0.7,
  useMockApi: true,
};

const modelOptions = [
  { label: 'Claude 3.5 Sonnet via Bedrock', value: 'amazon-bedrock-claude-3-5-sonnet' },
  { label: 'Claude 3 Haiku via Bedrock', value: 'amazon-bedrock-claude-3-haiku' },
  { label: 'OpenAI GPT API Proxy', value: 'openai-gpt-proxy' },
  { label: 'Custom Backend', value: 'custom-backend' },
];

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function createSession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: '新的对话',
    messages: [
      createMessage(
        'assistant',
        '你好，我是你的 Cloudscape AI 助手。可以从需求梳理、方案设计、代码生成或文档总结开始。',
      ),
    ],
    updatedAt: now,
  };
}

function titleFromMessage(content: string) {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.length > 18 ? `${cleaned.slice(0, 18)}...` : cleaned || '新的对话';
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = loadSessions();
    return saved.length ? saved : [createSession()];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => loadActiveSessionId() ?? sessions[0].id);
  const [settings, setSettings] = useState<ChatSettings>(() => loadSettings(defaultSettings));
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [flashItems, setFlashItems] = useState<FlashbarProps.MessageDefinition[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions],
  );

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, isSending]);

  const navigationItems: SideNavigationProps.Item[] = [
    { type: 'link', text: '新建对话', href: '#new' },
    { type: 'divider' },
    {
      type: 'section',
      text: '会话',
      items: sessions.map((session) => ({
        type: 'link',
        text: session.title,
        href: `#session/${session.id}`,
      })),
    },
  ];

  function updateActiveSession(updater: (session: ChatSession) => ChatSession) {
    setSessions((current) =>
      current.map((session) => (session.id === activeSession.id ? updater(session) : session)),
    );
  }

  function handleCreateSession() {
    const session = createSession();
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    setInput('');
  }

  function handleClearSession() {
    updateActiveSession((session) => ({
      ...session,
      title: '新的对话',
      messages: [createMessage('assistant', '上下文已清空。我们可以重新开始。')],
      updatedAt: new Date().toISOString(),
    }));
  }

  async function handleSend() {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSending) {
      return;
    }

    const userMessage = createMessage('user', trimmedInput);
    const nextMessages = [...activeSession.messages, userMessage];
    const shouldRename = activeSession.title === '新的对话';

    updateActiveSession((session) => ({
      ...session,
      title: shouldRename ? titleFromMessage(trimmedInput) : session.title,
      messages: nextMessages,
      updatedAt: new Date().toISOString(),
    }));
    setInput('');
    setIsSending(true);

    try {
      const reply = await sendChatRequest({ messages: nextMessages, settings });
      const assistantMessage = createMessage('assistant', reply);
      updateActiveSession((session) => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setFlashItems([
        {
          type: 'error',
          dismissible: true,
          dismissLabel: '关闭',
          onDismiss: () => setFlashItems([]),
          header: 'AI 请求失败',
          content: message,
          id: 'chat-error',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <TopNavigation
        identity={{ href: '#', title: 'AI Chat Console' }}
        utilities={[
          {
            type: 'button',
            text: '设置',
            iconName: 'settings',
            onClick: () => setToolsOpen(true),
          },
        ]}
      />
      <AppLayout
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        navigation={
          <SideNavigation
            activeHref={`#session/${activeSession.id}`}
            header={{ href: '#', text: '工作区' }}
            items={navigationItems}
            onFollow={(event) => {
              event.preventDefault();
              const href = event.detail.href;
              if (href === '#new') {
                handleCreateSession();
                return;
              }
              const sessionId = href.replace('#session/', '');
              if (sessions.some((session) => session.id === sessionId)) {
                setActiveSessionId(sessionId);
              }
            }}
          />
        }
        tools={
          <HelpPanel header={<h2>AI 设置</h2>}>
            <SpaceBetween size="l">
              <FormField label="模型">
                <Select
                  selectedOption={modelOptions.find((option) => option.value === settings.modelId) ?? modelOptions[0]}
                  options={modelOptions}
                  onChange={({ detail }) =>
                    setSettings((current) => ({
                      ...current,
                      modelId: String(detail.selectedOption.value),
                    }))
                  }
                />
              </FormField>
              <FormField label={`温度：${settings.temperature.toFixed(1)}`}>
                <Slider
                  value={settings.temperature}
                  min={0}
                  max={1}
                  step={0.1}
                  onChange={({ detail }) =>
                    setSettings((current) => ({
                      ...current,
                      temperature: detail.value,
                    }))
                  }
                />
              </FormField>
              <Toggle
                checked={settings.useMockApi}
                onChange={({ detail }) =>
                  setSettings((current) => ({
                    ...current,
                    useMockApi: detail.checked,
                  }))
                }
              >
                使用本地模拟回复
              </Toggle>
              <Box color="text-body-secondary" fontSize="body-s">
                关闭模拟回复并设置 <code>VITE_CHAT_API_URL</code> 后，将通过后端代理调用真实模型。
              </Box>
              <Link external href="https://cloudscape.design/">
                Cloudscape Design System
              </Link>
            </SpaceBetween>
          </HelpPanel>
        }
        content={
          <ContentLayout
            header={
              <Header
                variant="h1"
                description="基于 React、Vite 和 AWS Cloudscape 的 AI 聊天工作台"
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button iconName="add-plus" onClick={handleCreateSession}>
                      新建
                    </Button>
                    <Button iconName="remove" onClick={handleClearSession}>
                      清空
                    </Button>
                  </SpaceBetween>
                }
              >
                {activeSession.title}
              </Header>
            }
          >
            <SpaceBetween size="m">
              <Flashbar items={flashItems} />
              <Container
                header={
                  <Header
                    variant="h2"
                    description={`${activeSession.messages.length} 条消息`}
                    actions={
                      <Badge color={settings.useMockApi ? 'blue' : 'green'}>
                        {settings.useMockApi ? 'Mock' : 'Live API'}
                      </Badge>
                    }
                  >
                    对话
                  </Header>
                }
              >
                <div className="chat-shell">
                  <div className="message-list" aria-live="polite">
                    {activeSession.messages.map((message) => (
                      <article className={`message message--${message.role}`} key={message.id}>
                        <div className="message__meta">
                          <Badge color={message.role === 'user' ? 'green' : 'blue'}>
                            {message.role === 'user' ? '你' : '助手'}
                          </Badge>
                          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="message__content">{message.content}</div>
                      </article>
                    ))}
                    {isSending && (
                      <article className="message message--assistant">
                        <div className="message__meta">
                          <Badge color="blue">助手</Badge>
                          <span>生成中</span>
                        </div>
                        <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                          <Spinner />
                          <Box color="text-body-secondary">正在思考...</Box>
                        </SpaceBetween>
                      </article>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </Container>
              <Container>
                <SpaceBetween size="s">
                  <FormField label="输入消息">
                    <Textarea
                      value={input}
                      rows={4}
                      placeholder="输入你的问题，按 Ctrl + Enter 发送"
                      disabled={isSending}
                      onChange={({ detail }) => setInput(detail.value)}
                      onKeyDown={(event) => {
                        if (event.detail.key === 'Enter' && event.detail.ctrlKey) {
                          void handleSend();
                        }
                      }}
                    />
                  </FormField>
                  <Box float="right">
                    <Button
                      variant="primary"
                      iconName="angle-right"
                      loading={isSending}
                      disabled={!input.trim()}
                      onClick={() => void handleSend()}
                    >
                      发送
                    </Button>
                  </Box>
                </SpaceBetween>
              </Container>
            </SpaceBetween>
          </ContentLayout>
        }
      />
    </>
  );
}
