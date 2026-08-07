/**
 * Chat-history repository — on-device port of the Redis-backed conversation
 * endpoints in services/ai_coach/src/api.py. Conversations live in the local
 * `conversations` table (messages as a JSON column).
 */

import type { Conversation, ConversationSummary, ChatMessage } from '../../types/aiCoach';
import { all, one, run } from '../database';
import { LOCAL_USER_ID } from '../schema';

const U = LOCAL_USER_ID;
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 100;

interface ConversationRow {
  id: string;
  title: string;
  messages: string;
  created_at: string;
  updated_at: string;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const rows = await all<ConversationRow>(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
    [U],
  );
  return rows.map((r) => {
    let count = 0;
    try {
      count = (JSON.parse(r.messages) as ChatMessage[]).length;
    } catch {
      count = 0;
    }
    return { id: r.id, title: r.title, message_count: count, updated_at: r.updated_at };
  });
}

export async function getConversation(id: string): Promise<Conversation> {
  const r = await one<ConversationRow>('SELECT * FROM conversations WHERE id = ? AND user_id = ?', [id, U]);
  if (!r) throw new Error('Conversation not found');
  return {
    id: r.id,
    title: r.title,
    messages: JSON.parse(r.messages) as ChatMessage[],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function saveConversation(id: string, messages: ChatMessage[]): Promise<Conversation> {
  const now = new Date().toISOString();
  const existing = await one<ConversationRow>(
    'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
    [id, U],
  );
  const createdAt = existing?.created_at ?? now;

  // Auto-title from the first user message.
  let title = 'New Chat';
  const firstUser = messages.find((m) => m.role === 'user');
  if (firstUser) {
    title = firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '...' : '');
  }

  const trimmed = messages.slice(-MAX_MESSAGES);
  const payload = JSON.stringify(trimmed);

  if (existing) {
    await run('UPDATE conversations SET title = ?, messages = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
      title,
      payload,
      now,
      id,
      U,
    ]);
  } else {
    // Evict oldest if at capacity.
    const countRow = await one<{ n: number }>('SELECT COUNT(*) AS n FROM conversations WHERE user_id = ?', [U]);
    if ((countRow?.n ?? 0) >= MAX_CONVERSATIONS) {
      const oldest = await one<{ id: string }>(
        'SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at ASC LIMIT 1',
        [U],
      );
      if (oldest) await run('DELETE FROM conversations WHERE id = ? AND user_id = ?', [oldest.id, U]);
    }
    await run(
      'INSERT INTO conversations (id, user_id, title, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, U, title, payload, createdAt, now],
    );
  }

  return { id, title, messages: trimmed, created_at: createdAt, updated_at: now };
}

export async function deleteConversation(id: string): Promise<void> {
  await run('DELETE FROM conversations WHERE id = ? AND user_id = ?', [id, U]);
}
