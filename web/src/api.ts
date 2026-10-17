import {
  UserMetaResponse,
  ChatApiResponse,
  KnowledgeResponse,
  SessionSummary,
  Visual,
} from './types';

const BASE_URL = '';

export async function fetchUserMeta(): Promise<UserMetaResponse> {
  const res = await fetch(`${BASE_URL}/api/users`);
  if (!res.ok) {
    throw new Error(`Failed to load users: ${res.statusText}`);
  }
  return res.json();
}

export async function sendChatMessage(
  userId: string,
  message: string,
  sessionId?: string | null
): Promise<ChatApiResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      session_id: sessionId || null,
      message,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errBody.detail || `Server error: ${res.status}`);
  }

  return res.json();
}

export async function fetchUserSessions(userId: string): Promise<SessionSummary[]> {
  const res = await fetch(`${BASE_URL}/api/sessions/${encodeURIComponent(userId)}`);
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.sessions || [];
}

export interface SessionTurnRecord {
  question: string;
  answer: string;
  wells: string[];
  visual: Visual[];
}

export async function fetchSessionTurns(
  userId: string,
  sessionId: string
): Promise<SessionTurnRecord[]> {
  const res = await fetch(
    `${BASE_URL}/api/session/${encodeURIComponent(userId)}/${encodeURIComponent(sessionId)}`
  );
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.turns || [];
}

export async function fetchKnowledge(): Promise<KnowledgeResponse> {
  const res = await fetch(`${BASE_URL}/api/knowledge`);
  if (!res.ok) {
    throw new Error(`Failed to load knowledge: ${res.statusText}`);
  }
  return res.json();
}

export async function resetMemory(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/reset`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Failed to reset memory: ${res.statusText}`);
  }
}

export async function downloadTranscriptText(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/transcript`);
  if (!res.ok) {
    throw new Error(`Failed to download transcript: ${res.statusText}`);
  }
  return res.text();
}
