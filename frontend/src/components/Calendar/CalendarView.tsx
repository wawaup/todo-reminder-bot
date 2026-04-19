import React from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addDays, addMonths, subMonths, addWeeks, subWeeks, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Todo, ViewType, CATEGORIES } from '../../types';

interface CalendarViewProps {
  viewType: ViewType;
  currentDate: Date;
  todos: Todo[];
  onDateChange: (date: Date) => void;
  onViewChange: (type: ViewType) => void;
  onTodoClick?: (todo: Todo) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  viewType,
  currentDate,
  todos,
  onDateChange,
  onViewChange,
  onTodoClick,
}) => {
  const getTodosForDate = (date: Date): Todo[] => {
    return todos.filter((todo) => isSameDay(parseISO(todo.start_time), date));
  };

  const getTodoCountByDate = (date: Date): number => {
    return getTodosForDate(date).length;
  };

  const handlePrev = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(currentDate, -1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getHeaderTitle = (): string => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'yyyy年 M月 d日 EEEE', { locale: zhCN });
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'M月 d日')} - ${format(weekEnd, 'M月 d日')}`;
      case 'month':
        return format(currentDate, 'yyyy年 M月', { locale: zhCN });
    }
  };

  const viewTabs: { type: ViewType; label: string }[] = [
    { type: 'day', label: '日' },
    { type: 'week', label: '周' },
    { type: 'month', label: '月' },
  ];

  return (
    <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#8D6E63]" />
          </button>
          <h2 className="text-lg font-semibold text-[#5D4037] min-w-[180px] text-center">
            {getHeaderTitle()}
          </h2>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#8D6E63]" />
          </button>
        </div>

        <button
          onClick={handleToday}
          className="px-4 py-2 text-sm font-medium text-[#FF8A65] hover:bg-[#FFF3E0] rounded-xl transition-colors"
        >
          今天
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-4 p-1 bg-gray-50 rounded-xl">
        {viewTabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => onViewChange(tab.type)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              viewType === tab.type
                ? 'bg-white text-[#FF8A65] shadow-sm'
                : 'text-[#8D6E63] hover:text-[#5D4037]'
            }`}
          >
            {tab.label}视图
          </button>
        ))}
      </div>

      {/* Calendar Content */}
      <div className="min-h-[300px]">
        {viewType === 'day' && (
          <DayView
            date={currentDate}
            todos={getTodosForDate(currentDate)}
            onTodoClick={onTodoClick}
          />
        )}
        {viewType === 'week' && (
          <WeekView
            date={currentDate}
            todos={todos}
            getTodosForDate={getTodosForDate}
            onDateClick={onDateChange}
          />
        )}
        {viewType === 'month' && (
          <MonthView
            date={currentDate}
            todos={todos}
            getTodoCountByDate={getTodoCountByDate}
            onDateClick={(date) => {
              onDateChange(date);
              onViewChange('day');
            }}
          />
        )}
      </div>
    </div>
  );
};

// Day View Component
interface DayViewProps {
  date: Date;
  todos: Todo[];
  onTodoClick?: (todo: Todo) => void;
}

interface LayoutInfo {
  column: number;      // 任务所在列（从0开始）
  totalColumns: number; // 该重叠组的总列数
}

const DayView: React.FC<DayViewProps> = ({ date, todos }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_HEIGHT = 60; // 每小时的高度（像素）

  // 计算任务的精确位置和高度
  const getTaskPosition = (todo: Todo) => {
    const startTime = parseISO(todo.start_time);
    const endTime = parseISO(todo.end_time);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    // 计算从 0:00 开始的分钟数
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const durationMinutes = endTotalMinutes - startTotalMinutes;

    // 转换为像素位置
    const top = (startTotalMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24); // 最小高度 24px

    return { top, height };
  };

  // 检查两个任务是否有时间重叠
  const hasTimeOverlap = (todo1: Todo, todo2: Todo): boolean => {
    const start1 = new Date(todo1.start_time);
    const end1 = new Date(todo1.end_time);
    const start2 = new Date(todo2.start_time);
    const end2 = new Date(todo2.end_time);
    return start1 < end2 && end1 > start2;
  };

  // 计算重叠事件的布局
  const calculateOverlapLayout = (todos: Todo[]): Map<string, LayoutInfo> => {
    if (todos.length === 0) return new Map();

    const layout = new Map<string, LayoutInfo>();

    // 为每个任务检查是否有重叠
    for (const todo of todos) {
      const overlappingTodos = todos.filter(other =>
        other.id !== todo.id && hasTimeOverlap(todo, other)
      );

      // 如果没有重叠，占满整个宽度
      if (overlappingTodos.length === 0) {
        layout.set(todo.id, { column: 0, totalColumns: 1 });
      }
    }

    // 处理有重叠的任务组
    const processed = new Set<string>();

    for (const todo of todos) {
      if (processed.has(todo.id)) continue;

      // 找出与当前任务重叠的所有任务（包括间接重叠）
      const overlapGroup: Todo[] = [todo];
      const toCheck = [todo];

      while (toCheck.length > 0) {
        const current = toCheck.pop()!;

        for (const other of todos) {
          if (processed.has(other.id) || overlapGroup.some(t => t.id === other.id)) {
            continue;
          }

          // 检查是否与组内任何任务重叠
          if (overlapGroup.some(t => hasTimeOverlap(t, other))) {
            overlapGroup.push(other);
            toCheck.push(other);
          }
        }
      }

      // 如果只有一个任务，已经在上面处理过了
      if (overlapGroup.length === 1) {
        processed.add(todo.id);
        continue;
      }

      // 为重叠组分配列
      const sorted = overlapGroup.sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      const columns: Date[] = [];

      for (const t of sorted) {
        const start = new Date(t.start_time);
        const end = new Date(t.end_time);

        let column = 0;
        while (column < columns.length && columns[column] > start) {
          column++;
        }

        if (column < columns.length) {
          columns[column] = end;
        } else {
          columns.push(end);
        }

        layout.set(t.id, { column, totalColumns: columns.length });
        processed.add(t.id);
      }

      // 更新该组所有任务的 totalColumns
      const maxColumns = columns.length;
      for (const t of sorted) {
        const info = layout.get(t.id)!;
        info.totalColumns = maxColumns;
      }
    }

    return layout;
  };

  const layoutMap = calculateOverlapLayout(todos);

  return (
    <div className="relative">
      {/* 时间轴网格 */}
      <div className="space-y-0">
        {hours.map((hour) => (
          <div key={hour} className="flex" style={{ height: `${HOUR_HEIGHT}px` }}>
            <div className="w-16 flex-shrink-0 text-xs text-[#8D6E63] text-right pr-3 pt-1">
              {hour.toString().padStart(2, '0')}:00
            </div>
            <div className="flex-1 border-t border-gray-100" />
          </div>
        ))}
      </div>

      {/* 任务时间块（绝对定位） */}
      <div className="absolute top-0 left-16 right-0" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
        {todos.map((todo) => {
          const { top, height } = getTaskPosition(todo);
          const startTime = parseISO(todo.start_time);
          const layout = layoutMap.get(todo.id) || { column: 0, totalColumns: 1 };

          // 计算水平位置和宽度
          const columnWidth = 100 / layout.totalColumns;
          const leftPercent = layout.column * columnWidth;
          const widthPercent = columnWidth;

          return (
            <div
              key={todo.id}
              className="absolute px-2 py-1 rounded-lg text-xs overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              style={{
                top: `${top}px`,
                height: `${height}px`,
                left: `${leftPercent}%`,
                width: `calc(${widthPercent}% - 4px)`,
                backgroundColor: CATEGORIES[todo.category].bgColor,
                color: CATEGORIES[todo.category].color,
                border: `1px solid ${CATEGORIES[todo.category].color}20`,
              }}
              title={`${format(startTime, 'HH:mm')} - ${format(parseISO(todo.end_time), 'HH:mm')}: ${todo.title}`}
            >
              <div className="font-medium truncate">
                {CATEGORIES[todo.category].emoji} {format(startTime, 'HH:mm')} {todo.title}
              </div>
              {height > 40 && todo.description && (
                <div className="text-xs opacity-75 truncate mt-0.5">
                  {todo.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Week View Component
interface WeekViewProps {
  date: Date;
  todos: Todo[];
  getTodosForDate: (date: Date) => Todo[];
  onDateClick: (date: Date) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ date, getTodosForDate, onDateClick }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });

  const weekDaysZh = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Week Day Headers */}
      {weekDaysZh.map((day, idx) => (
        <div key={idx} className="text-center text-sm font-medium text-[#8D6E63] py-2">
          {day}
        </div>
      ))}

      {/* Date Cells */}
      {weekDays.map((day, idx) => {
        const dayTodos = getTodosForDate(day);
        const isToday = isSameDay(day, new Date());
        const isWeekend = idx >= 5;

        return (
          <div
            key={idx}
            onClick={() => onDateClick(day)}
            className={`min-h-[80px] p-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
              isToday
                ? 'bg-[#FFF3E0] ring-2 ring-[#FF8A65]'
                : isWeekend
                ? 'bg-gray-50'
                : 'bg-white border border-gray-100'
            }`}
          >
            <div
              className={`text-sm font-medium mb-1 ${
                isToday ? 'text-[#FF8A65]' : 'text-[#5D4037]'
              }`}
            >
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayTodos.slice(0, 3).map((todo) => (
                <div
                  key={todo.id}
                  className="text-xs px-1.5 py-0.5 rounded truncate"
                  style={{
                    backgroundColor: CATEGORIES[todo.category].bgColor,
                    color: CATEGORIES[todo.category].color,
                  }}
                >
                  {todo.title}
                </div>
              ))}
              {dayTodos.length > 3 && (
                <div className="text-xs text-[#8D6E63]">+{dayTodos.length - 3} 更多</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Month View Component
interface MonthViewProps {
  date: Date;
  todos: Todo[];
  getTodoCountByDate: (date: Date) => number;
  onDateClick: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ date, getTodoCountByDate, onDateClick }) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDaysZh = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div>
      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDaysZh.map((day, idx) => (
          <div key={idx} className="text-center text-sm font-medium text-[#8D6E63] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const todoCount = getTodoCountByDate(day);
          const isCurrentMonth = isSameMonth(day, date);
          const isToday = isSameDay(day, new Date());
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={idx}
              onClick={() => onDateClick(day)}
              className={`min-h-[60px] p-1.5 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                isToday
                  ? 'bg-[#FFF3E0] ring-2 ring-[#FF8A65]'
                  : !isCurrentMonth
                  ? 'bg-gray-50 opacity-50'
                  : isWeekend
                  ? 'bg-gray-50'
                  : 'bg-white border border-gray-100'
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  isToday ? 'text-[#FF8A65]' : !isCurrentMonth ? 'text-gray-400' : 'text-[#5D4037]'
                }`}
              >
                {format(day, 'd')}
              </div>
              {todoCount > 0 && (
                <div
                  className="mt-1 text-xs px-1.5 py-0.5 rounded-full inline-block"
                  style={{ backgroundColor: '#FF8A65', color: 'white' }}
                >
                  {todoCount} 项
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
