import { motion } from 'framer-motion';
import { Bot, Dumbbell, ClipboardCheck, Ruler } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ActionPerformed } from '../../types/aiCoach';

const ACTION_ICONS: Record<string, typeof Dumbbell> = {
  create_exercise: Dumbbell,
  edit_exercise: Dumbbell,
  log_workout: ClipboardCheck,
  add_measurement: Ruler,
};

const ACTION_LABELS: Record<string, string> = {
  create_exercise: 'Exercise added',
  edit_exercise: 'Exercise updated',
  log_workout: 'Workout logged',
  add_measurement: 'Measurement recorded',
};

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  index: number;
  actions?: ActionPerformed[];
  images?: string[];
}

export function ChatMessage({ role, content, index, actions, images }: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={`flex gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'}`}
    >
      {isAssistant ? (
        <div className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
          <Bot size={16} className="text-ember" />
        </div>
      ) : (
        <div className="w-8 h-8 [clip-path:var(--clip-tag)] bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center text-void text-xs font-bold shrink-0">
          You
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isAssistant
          ? 'bg-surface-2 text-chalk border border-border'
          : 'bg-gradient-to-br from-ember to-ember-dark text-white'
      }`}>
        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-20 h-20 rounded-lg object-cover border border-border/50"
              />
            ))}
          </div>
        )}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {actions.map((action, i) => {
              const Icon = ACTION_ICONS[action.action] ?? Dumbbell;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20"
                >
                  <Icon size={12} />
                  {ACTION_LABELS[action.action] ?? action.action}
                </span>
              );
            })}
          </div>
        )}
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
            code: ({ children }) => <code className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}
