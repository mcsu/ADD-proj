import type { ChatSession, ChatSettings } from './types';

const sessionsKey = 'cloudscape-ai-chat:sessions';
const activeSessionKey = 'cloudscape-ai-chat:active-session';
const settingsKey = 'cloudscape-ai-chat:settings';

export function loadSessions(): ChatSession[] {
  return readJson<ChatSession[]>(sessionsKey, []);
}

export function saveSessions(sessions: ChatSession[]) {
  window.localStorage.setItem(sessionsKey, JSON.stringify(sessions));
}

export function loadActiveSessionId(): string | null {
  return window.localStorage.getItem(activeSessionKey);
}

export function saveActiveSessionId(id: string) {
  window.localStorage.setItem(activeSessionKey, id);
}

export function loadSettings(defaults: ChatSettings): ChatSettings {
  return { ...defaults, ...readJson<Partial<ChatSettings>>(settingsKey, {}) };
}

export function saveSettings(settings: ChatSettings) {
  window.localStorage.setItem(settingsKey, JSON.stringify(settings));
}

function readJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
