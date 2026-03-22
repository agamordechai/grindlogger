import { useState, useCallback } from 'react';

export interface TemplateExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  workout_day: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
}

const STORAGE_KEY = 'workout_templates';

function loadTemplates(): WorkoutTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: WorkoutTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for non-secure contexts (HTTP)
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

export function useTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(loadTemplates);

  const addTemplate = useCallback((name: string, exercises: TemplateExercise[]) => {
    const template: WorkoutTemplate = {
      id: generateId(),
      name,
      exercises,
      createdAt: Date.now(),
    };
    setTemplates((prev) => {
      const next = [template, ...prev];
      saveTemplates(next);
      return next;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTemplates(next);
      return next;
    });
  }, []);

  return { templates, addTemplate, deleteTemplate };
}
