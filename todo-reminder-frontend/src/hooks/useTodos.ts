import { useState, useEffect, useCallback } from 'react';
import { supabase, getTodayStart, getTodayEnd, getWeekRange, getMonthRange } from '../lib/supabase';
import { Todo, TodoFormData, ViewType } from '../types';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('todos')
        .select('*')
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setTodos(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const createTodo = async (formData: TodoFormData): Promise<boolean> => {
    try {
      const { error: createError } = await supabase.from('todos').insert({
        title: formData.title,
        description: formData.description || null,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        category: formData.category,
        is_completed: false,
      });

      if (createError) throw createError;
      await fetchTodos();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo');
      return false;
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchTodos();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
      return false;
    }
  };

  const deleteTodo = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('todos').delete().eq('id', id);

      if (deleteError) throw deleteError;
      await fetchTodos();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
      return false;
    }
  };

  const completeTodo = async (id: string, feeling?: string): Promise<boolean> => {
    return updateTodo(id, {
      is_completed: true,
      completed_at: new Date().toISOString(),
      feeling: feeling || null,
    });
  };

  const uncompleteTodo = async (id: string): Promise<boolean> => {
    return updateTodo(id, {
      is_completed: false,
      completed_at: null,
      feeling: null,
    });
  };

  return {
    todos,
    loading,
    error,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    completeTodo,
    uncompleteTodo,
  };
};

export const useFilteredTodos = (todos: Todo[], viewType: ViewType, currentDate: Date) => {
  const getFilteredTodos = useCallback(() => {
    switch (viewType) {
      case 'day': {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        return todos.filter((todo) => {
          const todoDate = new Date(todo.start_time);
          return todoDate >= dayStart && todoDate <= dayEnd;
        });
      }

      case 'week': {
        const weekRange = getWeekRange(currentDate);
        return todos.filter((todo) => {
          const todoDate = new Date(todo.start_time);
          return todoDate >= new Date(weekRange.start) && todoDate <= new Date(weekRange.end);
        });
      }

      case 'month': {
        const monthRange = getMonthRange(currentDate);
        return todos.filter((todo) => {
          const todoDate = new Date(todo.start_time);
          return todoDate >= new Date(monthRange.start) && todoDate <= new Date(monthRange.end);
        });
      }

      default:
        return todos;
    }
  }, [todos, viewType, currentDate]);

  return getFilteredTodos();
};
