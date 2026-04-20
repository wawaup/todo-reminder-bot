import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addDays, addMonths, subMonths, addWeeks, subWeeks, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Todo, ViewType, getCategoryInfo } from '../../types';

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
      <div className="min-h-[500px]">
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

const DayView: React.FC<DayViewProps> = ({ date, todos }) => {
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const containerRef = React.useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_HEIGHT = 80; // 每小时80px，15分钟=20px
  const MIN_EVENT_HEIGHT = 28; // 常规事件最小高度
  const SHORT_EVENT_HEIGHT = 24; // 短事件（<15分钟）最小高度
  const SHORT_EVENT_THRESHOLD = 15; // 短事件阈值（分钟）
  const EVENT_GAP = 4; // 事件右边距和底部间距

  const getTaskPosition = (todo: Todo) => {
    const startTime = parseISO(todo.start_time);
    const endTime = parseISO(todo.end_time);
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const durationMinutes = endMinutes - startMinutes;
    const top = (startMinutes / 60) * HOUR_HEIGHT;

    // 短事件使用更小的最小高度
    const minHeight = durationMinutes < SHORT_EVENT_THRESHOLD ? SHORT_EVENT_HEIGHT : MIN_EVENT_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, minHeight);

    return { top, height, durationMinutes };
  };

  const layoutPositions = React.useMemo(() => {
    const sorted = [...todos].sort((a, b) =>
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    );

    const columns: number[] = new Array(sorted.length).fill(0);
    const maxCols: number[] = new Array(sorted.length).fill(1);

    for (let i = 0; i < sorted.length; i++) {
      const startI = parseISO(sorted[i].start_time).getTime();
      const endI = parseISO(sorted[i].end_time).getTime();

      const overlapping = sorted
        .map((t, j) => ({ j, start: parseISO(t.start_time).getTime(), end: parseISO(t.end_time).getTime() }))
        .filter(({ j, start, end }) => j !== i && start < endI && end > startI);

      const usedCols = new Set(overlapping.filter(({ j }) => j < i).map(({ j }) => columns[j]));
      let col = 0;
      while (usedCols.has(col)) col++;
      columns[i] = col;

      const groupIndices = [i, ...overlapping.map(({ j }) => j)];
      const groupMaxCol = Math.max(...groupIndices.map(idx => columns[idx])) + 1;
      groupIndices.forEach(idx => { maxCols[idx] = Math.max(maxCols[idx], groupMaxCol); });
    }

    const positions = new Map<string, { top: number; height: number; left: string; width: string }>();
    sorted.forEach((todo, i) => {
      const { top, height } = getTaskPosition(todo);
      const col = columns[i];
      const max = maxCols[i];
      const leftPct = (col / max) * 100;
      const widthPct = (1 / max) * 100;
      positions.set(todo.id, {
        top,
        height,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      });
    });

    return positions;
  }, [todos]);


  // 自动滚动到当前时间
  React.useEffect(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const scrollPosition = (currentMinutes / 60) * HOUR_HEIGHT - 120; // 当前时间往上留120px空间

    const container = containerRef.current;
    if (container) {
      container.scrollTop = Math.max(0, scrollPosition);
    }
  }, [date]);

  // 每分钟更新一次时间线
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每60秒更新一次

    return () => clearInterval(timer);
  }, []);

  // 计算当前时间线的位置
  const getCurrentTimePosition = () => {
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return (currentMinutes / 60) * HOUR_HEIGHT;
  };

  const isToday = isSameDay(date, new Date());

  return (
    <>
      <div
        ref={containerRef}
        className="relative overflow-y-auto"
        style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
      >
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

        {/* 实时时间线（仅在今天显示） */}
        {isToday && (
          <div
            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: `${getCurrentTimePosition()}px` }}
          >
            <div className="w-16 text-xs font-semibold text-red-500 bg-red-50 rounded px-2 py-0.5 text-right">
              {format(currentTime, 'HH:mm')}
            </div>
            <div className="flex-1 h-0.5 bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
          </div>
        )}

        {/* 任务时间块（绝对定位） */}
        <div className="absolute top-0 left-16 right-0" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {todos.map((todo) => {
            const position = layoutPositions.get(todo.id);
            if (!position) return null;

            const { top, height, left, width } = position;
            const startTime = parseISO(todo.start_time);
            const endTime = parseISO(todo.end_time);
            const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
            const isShortEvent = durationMinutes < SHORT_EVENT_THRESHOLD;

            return (
              <div
                key={todo.id}
                onClick={() => setSelectedTodo(todo)}
                className={`absolute px-2 py-1 rounded text-xs overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                  todo.is_completed ? 'opacity-60' : ''
                }`}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left,
                  width,
                  backgroundColor: getCategoryInfo(todo.category).bgColor,
                  color: getCategoryInfo(todo.category).color,
                }}
                title={`${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}: ${todo.title}`}
              >
                {isShortEvent ? (
                  <div className={`font-medium truncate ${todo.is_completed ? 'line-through' : ''}`}>
                    {getCategoryInfo(todo.category).emoji} {format(startTime, 'HH:mm')} {todo.title}
                    {todo.description && <span className="opacity-75"> - {todo.description}</span>}
                  </div>
                ) : (
                  <>
                    <div className={`font-medium truncate ${todo.is_completed ? 'line-through' : ''}`}>
                      {getCategoryInfo(todo.category).emoji} {format(startTime, 'HH:mm')} {todo.title}
                    </div>
                    {height > 40 && todo.description && (
                      <div className="text-xs opacity-75 truncate mt-0.5">
                        {todo.description}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 任务详情弹窗 */}
      {selectedTodo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTodo(null)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTodo(null)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-[#8D6E63]" />
            </button>

            <h3 className={`text-xl font-semibold text-[#5D4037] mb-4 pr-8 ${selectedTodo.is_completed ? 'line-through' : ''}`}>
              {selectedTodo.title}
            </h3>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{getCategoryInfo(selectedTodo.category).emoji}</span>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: getCategoryInfo(selectedTodo.category).bgColor,
                  color: getCategoryInfo(selectedTodo.category).color,
                }}
              >
                {getCategoryInfo(selectedTodo.category).label}
              </span>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="text-sm text-[#8D6E63] mb-1">时间</div>
              <div className="text-[#5D4037] font-medium">
                {format(parseISO(selectedTodo.start_time), 'HH:mm')} - {format(parseISO(selectedTodo.end_time), 'HH:mm')}
              </div>
              <div className="text-xs text-[#8D6E63] mt-1">
                {format(parseISO(selectedTodo.start_time), 'yyyy年M月d日 EEEE', { locale: zhCN })}
              </div>
            </div>

            {selectedTodo.description && (
              <div className="mb-4">
                <div className="text-sm text-[#8D6E63] mb-1">描述</div>
                <div className="text-[#5D4037] whitespace-pre-wrap">{selectedTodo.description}</div>
              </div>
            )}

            {selectedTodo.is_completed && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 font-medium">✓ 已完成</span>
                </div>
                {selectedTodo.feeling && (
                  <div>
                    <div className="text-sm text-green-700 mb-1">完成感受</div>
                    <div className="text-green-800">{selectedTodo.feeling}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
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
                    backgroundColor: getCategoryInfo(todo.category).bgColor,
                    color: getCategoryInfo(todo.category).color,
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
