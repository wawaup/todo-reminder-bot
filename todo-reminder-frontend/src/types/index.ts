// 全局类型定义

export type TodoCategory = 'life' | 'daily' | 'work' | 'study';

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
  life: {
    emoji: '🏠',
    label: '生活琐事',
    color: '#FF8A65',
    bgColor: '#FFF3E0',
  },
  daily: {
    emoji: '☀️',
    label: '日常提醒',
    color: '#FFD54F',
    bgColor: '#FFFDE7',
  },
  work: {
    emoji: '💼',
    label: '工作事件',
    color: '#64B5F6',
    bgColor: '#E3F2FD',
  },
  study: {
    emoji: '📚',
    label: '学习任务',
    color: '#BA68C8',
    bgColor: '#F3E5F5',
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
