// 全局类型定义

export type TodoCategory = 'study' | 'health' | 'exercise' | 'sleep' | 'meditation' | 'daily';

export type FeelingType = 'great' | 'okay' | 'sad' | 'energetic' | 'exceeded' | 'custom';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category: TodoCategory;
  is_completed: boolean;
  completed_at?: string;
  feeling?: string;
  created_at: string;
  updated_at: string;
}

export interface TodoFormData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category: TodoCategory;
}

export interface BotInteraction {
  id: string;
  todo_id: string;
  message_id?: string;
  action: 'complete' | 'feelings' | 'cancel';
  content?: string;
  created_at: string;
}

export interface CategoryInfo {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: Record<TodoCategory, CategoryInfo> = {
  study: {
    emoji: '📚',
    label: '学习',
    color: '#BA68C8',
    bgColor: '#F3E5F5',
  },
  health: {
    emoji: '🥗',
    label: '健康',
    color: '#66BB6A',
    bgColor: '#E8F5E9',
  },
  exercise: {
    emoji: '💪',
    label: '运动',
    color: '#FF7043',
    bgColor: '#FBE9E7',
  },
  sleep: {
    emoji: '🌙',
    label: '作息',
    color: '#5C6BC0',
    bgColor: '#E8EAF6',
  },
  meditation: {
    emoji: '🧘',
    label: '冥想',
    color: '#26A69A',
    bgColor: '#E0F2F1',
  },
  daily: {
    emoji: '🏠',
    label: '日常',
    color: '#FFD54F',
    bgColor: '#FFFDE7',
  },
};

export const FEELINGS: { type: FeelingType; emoji: string; label: string }[] = [
  { type: 'great', emoji: '😊', label: '很棒' },
  { type: 'okay', emoji: '😐', label: '一般' },
  { type: 'sad', emoji: '😔', label: '有点沮丧' },
  { type: 'energetic', emoji: '💪', label: '充满能量' },
  { type: 'exceeded', emoji: '🎉', label: '超额完成' },
];

export type ViewType = 'day' | 'week' | 'month';

export interface Dayjs {
  toDate(): Date;
  format(format: string): string;
  startOf(unit: string): Dayjs;
  endOf(unit: string): Dayjs;
  add(amount: number, unit: string): Dayjs;
  subtract(amount: number, unit: string): Dayjs;
  date(): number;
  month(): number;
  year(): number;
  day(): number;
  isSame(date: Date | Dayjs, unit?: string): boolean;
  isBefore(date: Date | Dayjs, unit?: string): boolean;
  isAfter(date: Date | Dayjs, unit?: string): boolean;
}
