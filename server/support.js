import crypto from 'crypto';
import { fetch as undiciFetch } from 'undici';

export const SUPPORT_SYSTEM_PROMPT = `Ты — помощник техподдержки сервиса JustRouter (https://justrouter.ru).
JustRouter — российский агрегатор AI-моделей: текст, фото, видео и аудио с оплатой в рублях.

Что важно знать пользователям:
- Регистрация по email с кодом подтверждения; после регистрации начисляется приветственный бонус на баланс.
- Пополнение баланса — в личном кабинете через ЮKassa (кнопка «Пополнить»).
- Модели доступны в каталоге на сайте; у каждого пользователя есть API-ключ в личном кабинете.
- Списание идёт с баланса (сначала бонус, потом основной).
- Документация API: /docs на сайте.

Правила ответов:
- Отвечай по-русски, кратко и дружелюбно.
- Не выдумывай точные цены, суммы бонусов и технические детали — если не уверен, скажи обратиться в личный кабинет или дождаться оператора.
- Если вопрос сложный, про оплату/возврат/баг — предложи передать оператору и скажи, что специалист ответит в этом же чате.`;

export function getGuestToken() {
  return `gst_${cryptoRandom()}`;
}

function cryptoRandom() {
  return crypto.randomUUID().replace(/-/g, '');
}

export function getOrCreateConversation(db, { userId, guestToken }) {
  if (userId) {
    let conversation = db.prepare('SELECT * FROM support_conversations WHERE user_id = ?').get(userId);
    if (!conversation) {
      const result = db.prepare(`
        INSERT INTO support_conversations (user_id, guest_token, updated_at)
        VALUES (?, NULL, datetime('now'))
      `).run(userId);
      conversation = db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(result.lastInsertRowid);
    }
    return conversation;
  }

  const token = guestToken || getGuestToken();
  let conversation = db.prepare('SELECT * FROM support_conversations WHERE guest_token = ?').get(token);
  if (!conversation) {
    const result = db.prepare(`
      INSERT INTO support_conversations (user_id, guest_token, updated_at)
      VALUES (NULL, ?, datetime('now'))
    `).run(token);
    conversation = db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(result.lastInsertRowid);
  }
  return { ...conversation, guest_token: conversation.guest_token || token };
}

export function getConversationMessages(db, conversationId) {
  return db.prepare(`
    SELECT id, role, content, admin_user_id, created_at
    FROM support_messages
    WHERE conversation_id = ?
    ORDER BY id ASC
  `).all(conversationId);
}

export function resolveSupportModel(db, modelIdEnv) {
  const modelId = modelIdEnv || 'google/gemini-2.5-flash';
  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(modelId);
  return model || { id: modelId, category: 'text', name: modelId };
}

export async function requestSupportCompletion({
  modelId,
  messages,
  apiKey,
  modelMap,
  dispatcher,
  maxTokens = 1024,
}) {
  if (!apiKey) {
    throw new Error('Сервис моделей временно недоступен');
  }

  const mappedModel = modelMap?.[modelId] || modelId;
  const response = await undiciFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    dispatcher,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://justrouter.ru',
      'X-Title': 'JustRouter Support',
    },
    body: JSON.stringify({
      model: mappedModel,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'Не удалось получить ответ от модели');
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Модель вернула пустой ответ');
  }

  return text;
}

export async function generateSupportAssistantReply(db, conversationId, {
  apiKey,
  modelIdEnv,
  modelMap,
  dispatcher,
}) {
  const history = getConversationMessages(db, conversationId);
  const model = resolveSupportModel(db, modelIdEnv);

  const llmMessages = [
    { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
    ...history.map((msg) => ({
      role: msg.role === 'admin' ? 'assistant' : msg.role,
      content: msg.role === 'admin' ? `[Оператор]: ${msg.content}` : msg.content,
    })),
  ];

  if (apiKey && model.category === 'text') {
    return requestSupportCompletion({
      modelId: model.id,
      messages: llmMessages,
      apiKey,
      modelMap,
      dispatcher,
    });
  }

  return 'Спасибо за сообщение! Оператор скоро ответит в этом чате.';
}

export function formatConversationRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    guest_token: row.guest_token,
    handoff_to_human: !!row.handoff_to_human,
    user_email: row.user_email || null,
    user_name: row.user_name || null,
    message_count: row.message_count || 0,
    last_message: row.last_message || null,
    last_message_at: row.last_message_at || row.updated_at,
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}
