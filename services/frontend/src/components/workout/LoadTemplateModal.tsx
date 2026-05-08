import { useState, useEffect } from 'react';
import { Trash2, Upload, ChevronLeft, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatWeight } from '../../hooks/useUnits';
import { useDialog } from '../ui/ConfirmDialog';
import { getDayColor } from '../../lib/constants';
import { useCycleDays } from '../../hooks/useCycleDays';
import type { WorkoutTemplate } from '../../hooks/useTemplates';

interface LoadTemplateModalProps {
  open: boolean;
  onClose: () => void;
  templates: WorkoutTemplate[];
  onLoad: (template: WorkoutTemplate) => void;
  onDelete: (id: string) => void;
}

export function LoadTemplateModal({ open, onClose, templates, onLoad, onDelete }: LoadTemplateModalProps) {
  const { confirm } = useDialog();
  const activeDays = useCycleDays();
  const letterDays = activeDays.filter(d => d !== 'Daily');

  const [selected, setSelected] = useState<WorkoutTemplate | null>(null);
  const [dayMap, setDayMap] = useState<Record<string, string>>({});

  // Initialise mapping whenever a template is selected
  useEffect(() => {
    if (!selected) return;
    const uniqueDays = [...new Set(selected.exercises.map(ex => ex.workout_day))];
    const map: Record<string, string> = {};
    for (const day of uniqueDays) {
      if (day === 'None') {
        map[day] = 'None';
      } else if (letterDays.includes(day)) {
        map[day] = day;
      } else {
        map[day] = letterDays[0] ?? day;
      }
    }
    setDayMap(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  const handleLoad = async (template: WorkoutTemplate) => {
    if (await confirm({
      title: 'Load routine',
      message: `Add ${template.exercises.length} exercise${template.exercises.length !== 1 ? 's' : ''} from "${template.name}" to your routine?`,
      confirmText: 'Load',
    })) {
      const remapped: WorkoutTemplate = {
        ...template,
        exercises: template.exercises.map(ex => ({
          ...ex,
          workout_day: dayMap[ex.workout_day] ?? ex.workout_day,
        })),
      };
      onLoad(remapped);
      handleClose();
    }
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    if (await confirm({ title: 'Delete routine', message: `Delete "${template.name}"? This cannot be undone.`, type: 'danger', confirmText: 'Delete' })) {
      onDelete(template.id);
      setSelected(null);
    }
  };

  const groupByDay = (template: WorkoutTemplate) => {
    const map = new Map<string, typeof template.exercises>();
    for (const ex of template.exercises) {
      if (!map.has(ex.workout_day)) map.set(ex.workout_day, []);
      map.get(ex.workout_day)!.push(ex);
    }
    return map;
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={selected ? selected.name : 'Saved Routines'}
      description={selected ? `Saved ${new Date(selected.createdAt).toLocaleDateString()}` : 'Select a routine to preview or load'}
    >
      {selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 text-xs text-steel hover:text-chalk mb-4 transition-colors"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          {/* Day mapping */}
          <div className="mb-4 p-3 rounded-xl bg-surface-2/40 border border-border/60 space-y-2">
            <p className="text-[11px] font-semibold text-steel uppercase tracking-wide mb-2">Load days as</p>
            {Object.entries(dayMap).map(([from, to]) => {
              const fromColor = getDayColor(from);
              const toColor = getDayColor(to);
              return (
                <div key={from} className="flex items-center gap-2">
                  <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded border ${fromColor.bg} ${fromColor.text} ${fromColor.border}`}>
                    {from === 'None' ? 'Daily' : `Day ${from}`}
                  </span>
                  <ArrowRight size={12} className="text-steel/50 shrink-0" />
                  <div className="flex flex-wrap gap-1 flex-1">
                    {letterDays.map(d => {
                      const c = getDayColor(d);
                      const active = to === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDayMap(prev => ({ ...prev, [from]: d }))}
                          className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all border ${active ? `${c.bg} ${c.text} ${c.border}` : 'bg-surface-2 text-steel border-border hover:text-chalk'}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setDayMap(prev => ({ ...prev, [from]: 'None' }))}
                      className={`px-2 h-7 rounded-lg text-[11px] font-bold transition-all border ${to === 'None' ? `${toColor.bg} ${toColor.text} ${toColor.border}` : 'bg-surface-2 text-steel border-border hover:text-chalk'}`}
                    >
                      Daily
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exercise preview grouped by template day */}
          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
            {[...groupByDay(selected).entries()].map(([day, exercises]) => {
              const color = getDayColor(day);
              return (
                <div key={day}>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold mb-2 border ${color.bg} ${color.text} ${color.border}`}>
                    {day === 'None' ? 'Daily' : `Day ${day}`}
                  </div>
                  <div className="space-y-1">
                    {exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/50">
                        <span className="text-sm text-chalk">{ex.name}</span>
                        <span className="text-xs text-steel font-mono">
                          {ex.sets}&times;{ex.reps}
                          {ex.weight != null && ex.weight > 0 && ` · ${formatWeight(ex.weight)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => handleLoad(selected)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-ember/15 text-ember border border-ember/30 hover:bg-ember/25 transition-colors"
            >
              <Upload size={13} />
              Load Routine
            </button>
            <button
              onClick={() => handleDelete(selected)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-steel text-sm">No saved routines yet</p>
          <p className="text-steel/60 text-xs mt-1">Save your current routine to create one</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {templates.map((template) => {
            const days = [...new Set(template.exercises.map((ex) => ex.workout_day))];
            return (
              <button
                key={template.id}
                onClick={() => setSelected(template)}
                className="w-full text-left rounded-xl border border-border bg-surface-2/30 hover:bg-surface-2/60 hover:border-ember/30 transition-all px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-chalk">{template.name}</h4>
                  <span className="text-[11px] text-steel">{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-steel mb-2">
                  {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''} · {days.length} day{days.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1">
                  {days.map((day) => {
                    const color = getDayColor(day);
                    return (
                      <span key={day} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color.bg} ${color.text} ${color.border}`}>
                        {day === 'None' ? 'Daily' : day}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
