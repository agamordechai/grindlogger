import { motion } from 'framer-motion';
import { Bot, Dumbbell, ClipboardCheck, Ruler } from 'lucide-react';
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
}

export function ChatMessage({ role, content, index, actions }: ChatMessageProps) {
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
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center text-white text-xs font-bold shrink-0">
          You
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isAssistant
          ? 'bg-surface-2 text-chalk border border-border'
          : 'bg-gradient-to-br from-ember to-ember-dark text-white'
      }`}>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {actions.map((action, i) => {
              const Icon = ACTION_ICONS[action.action] ?? Dumbbell;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                >
                  <Icon size={12} />
                  {ACTION_LABELS[action.action] ?? action.action}
                </span>
              );
            })}
          </div>
        )}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </motion.div>
  );
}
