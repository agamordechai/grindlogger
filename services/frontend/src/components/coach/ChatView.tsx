import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageSquarePlus, History, Trash2, X, ChevronLeft, ImagePlus } from 'lucide-react';
import { chatWithCoach, listConversations, getConversation, saveConversation, deleteConversation } from '../../api/client';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType, ConversationSummary, ActionPerformed } from '../../types/aiCoach';

interface ChatMessageWithActions extends ChatMessageType {
  actions?: ActionPerformed[];
}

const MAX_IMAGES_PER_MESSAGE = 4;
const MAX_IMAGE_DIMENSION = 1568; // Anthropic's recommended max — larger images are downscaled, not rejected.

/** Downscale + re-encode an image file to a compact JPEG data URL before attaching it. */
async function fileToResizedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

const WELCOME_MESSAGE: ChatMessageWithActions = {
  role: 'assistant',
  content: "Hey! I'm your AI fitness coach. Ask me anything about your routine, form tips, or training strategy. I can see your current exercises and give personalized advice. I can also add exercises, log workouts, and record measurements for you — just ask!",
};

const DEFAULT_MESSAGES: ChatMessageWithActions[] = [WELCOME_MESSAGE];

const SUGGESTIONS = [
  "What exercises should I add for balance?",
  "How can I improve my bench press?",
  "Add 3 sets of 10 bicep curls at 15kg to day B",
  "Log today's workout: day A, 45 minutes",
];

function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessageWithActions[]>(DEFAULT_MESSAGES);
  const [conversationId, setConversationId] = useState<string>(generateId);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const imageInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debounced save to Redis after messages change (only if there are user messages)
  const persistMessages = useCallback((msgs: ChatMessageWithActions[], convId: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    // Only save if there are user messages
    if (!msgs.some(m => m.role === 'user')) return;
    saveTimeoutRef.current = setTimeout(() => {
      saveConversation(convId, msgs).catch(() => {
        // Silent fail — sessionStorage is the fallback
      });
    }, 1000);
  }, []);

  useEffect(() => {
    persistMessages(messages, conversationId);
  }, [messages, conversationId, persistMessages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file later
    if (!files.length) return;
    setImageError(null);

    const room = MAX_IMAGES_PER_MESSAGE - pendingImages.length;
    if (room <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES_PER_MESSAGE} images per message.`);
      return;
    }
    try {
      const resized = await Promise.all(files.slice(0, room).map(fileToResizedDataUrl));
      setPendingImages(prev => [...prev, ...resized]);
    } catch {
      setImageError('Could not read that image.');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0) || loading) return;

    const userMessage = input.trim();
    const images = pendingImages;
    setInput('');
    setPendingImages([]);

    // Capture history before adding the new user message — skip the welcome message
    const history = messages
      .filter((_, i) => i > 0)
      .map(({ role, content, images: imgs }) => ({ role, content, images: imgs }));

    setMessages(prev => [...prev, { role: 'user', content: userMessage, images: images.length ? images : undefined }]);
    setLoading(true);

    try {
      const response = await chatWithCoach(userMessage, includeContext, history, images.length ? images : undefined);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        actions: response.actions_performed?.length ? response.actions_performed : undefined,
      }]);
      // If the coach performed actions, dispatch an event so other components can refresh
      if (response.actions_performed?.length) {
        window.dispatchEvent(new CustomEvent('coach-action', { detail: response.actions_performed }));
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'An Anthropic API key is required to use the AI Coach. Please set your key in Settings.' },
        ]);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}. Please make sure the AI Coach service is running.` },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages(DEFAULT_MESSAGES);
    setConversationId(generateId());
    setShowHistory(false);
  };

  const handleOpenHistory = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const convos = await listConversations();
      setConversations(convos);
    } catch {
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadConversation = async (id: string) => {
    try {
      const convo = await getConversation(id);
      setConversationId(convo.id);
      setMessages(convo.messages);
      setShowHistory(false);
    } catch {
      // Conversation might have expired
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      // If we deleted the active conversation, start fresh
      if (id === conversationId) {
        handleNewChat();
      }
    } catch {
      // Silent fail
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // History panel
  if (showHistory) {
    return (
      <div className="card flex flex-col p-0 overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <button onClick={() => setShowHistory(false)} className="text-steel hover:text-chalk transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-sm font-medium text-chalk flex-1">Chat History</h3>
          <button onClick={() => setShowHistory(false)} className="text-steel hover:text-chalk transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-ember border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-steel/60 text-sm">
              No saved conversations yet. Start chatting and your history will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleLoadConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors group ${
                    conv.id === conversationId ? 'bg-ember/5 border-l-2 border-l-ember' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-chalk truncate">{conv.title}</p>
                      <p className="text-xs text-steel/60 mt-0.5">
                        {conv.message_count} messages · {formatDate(conv.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 text-steel hover:text-danger transition-all p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col p-0 overflow-hidden" style={{ height: 'calc(100vh - 14rem)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} index={idx} actions={msg.actions} images={msg.images} />
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
              <div className="w-3 h-3 rounded-full bg-ember animate-ember-pulse" />
            </div>
            <div className="bg-surface-2 border border-border rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-steel/40 animate-typing" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 rounded-full bg-steel/40 animate-typing" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-steel/40 animate-typing" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-steel/60 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((q, idx) => (
              <button
                key={idx}
                className="text-xs px-3 py-1.5 rounded-lg bg-ember/10 border border-ember/20 text-ember hover:bg-ember/20 transition-colors"
                onClick={() => setInput(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIncludeContext(!includeContext)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${includeContext
              ? 'bg-ember/10 border-ember/30 text-ember'
              : 'bg-surface-2 border-border text-steel'
              }`}
          >
            {includeContext ? 'Workout context: ON' : 'Workout context: OFF'}
          </button>
          <button
            onClick={handleNewChat}
            className="text-xs px-3 py-1 rounded-full border border-border text-steel hover:text-chalk hover:border-steel/40 transition-all flex items-center gap-1"
          >
            <MessageSquarePlus size={12} />
            New Chat
          </button>
          <button
            onClick={handleOpenHistory}
            className="text-xs px-3 py-1 rounded-full border border-border text-steel hover:text-chalk hover:border-steel/40 transition-all flex items-center gap-1"
          >
            <History size={12} />
            History
          </button>
        </div>
        {imageError && <p className="text-xs text-danger">{imageError}</p>}
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingImages.map((src, idx) => (
              <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-void/70 text-chalk flex items-center justify-center"
                  aria-label="Remove image"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            className="text-steel hover:text-chalk transition-colors self-end px-2 py-2"
            onClick={() => imageInputRef.current?.click()}
            disabled={loading || pendingImages.length >= MAX_IMAGES_PER_MESSAGE}
            aria-label="Attach image"
          >
            <ImagePlus size={18} />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask your AI coach anything..."
            disabled={loading}
            rows={2}
            className="input flex-1 resize-none"
          />
          <button
            className="btn btn-ember self-end px-3"
            onClick={handleSend}
            disabled={(!input.trim() && pendingImages.length === 0) || loading}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
