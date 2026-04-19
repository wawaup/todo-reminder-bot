import React, { useState } from 'react';
import { Check, Trash2, Edit3, Clock, X } from 'lucide-react';
import { Todo, CATEGORIES, FEELINGS, FeelingType } from '../../types';
import { Button } from '../common';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TodoItemProps {
  todo: Todo;
  index?: number;
  onComplete: (id: string, feeling?: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  index,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const [showFeelings, setShowFeelings] = useState(false);
  const [customFeeling, setCustomFeeling] = useState('');

  const categoryInfo = CATEGORIES[todo.category];
  const startTime = parseISO(todo.start_time);
  const endTime = parseISO(todo.end_time);

  const handleComplete = () => {
    if (todo.is_completed) {
      onUncomplete(todo.id);
    } else {
      setShowFeelings(true);
    }
  };

  const handleFeelingSelect = (feeling: FeelingType) => {
    if (feeling === 'custom') {
      if (customFeeling.trim()) {
        onComplete(todo.id, customFeeling.trim());
        setShowFeelings(false);
        setCustomFeeling('');
      }
    } else {
      const feelingInfo = FEELINGS.find((f) => f.type === feeling);
      onComplete(todo.id, feelingInfo?.emoji + ' ' + feelingInfo?.label);
      setShowFeelings(false);
    }
  };

  const formatTimeRange = () => {
    const start = format(startTime, 'HH:mm');
    const end = format(endTime, 'HH:mm');
    return `${start} - ${end}`;
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          todo.is_completed ? 'bg-gray-50 opacity-60' : 'bg-white'
        }`}
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <button
          onClick={handleComplete}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            todo.is_completed
              ? 'bg-[#81C784] border-[#81C784] text-white'
              : 'border-[#FF8A65] hover:bg-[#FFF3E0]'
          }`}
        >
          {todo.is_completed && <Check className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{categoryInfo.emoji}</span>
            <span
              className={`text-sm font-medium truncate ${
                todo.is_completed ? 'line-through text-gray-400' : 'text-[#5D4037]'
              }`}
            >
              {todo.title}
            </span>
          </div>
        </div>

        <span className="text-xs text-[#8D6E63]">{formatTimeRange()}</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative p-2.5 rounded-xl transition-all ${
          todo.is_completed ? 'bg-gray-50' : 'bg-white'
        }`}
        style={{
          boxShadow: '0 1px 6px rgba(0, 0, 0, 0.06)',
          borderLeft: `3px solid ${todo.is_completed ? '#ccc' : categoryInfo.color}`,
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-2">
          {/* Complete Button */}
          <button
            onClick={handleComplete}
            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              todo.is_completed
                ? 'bg-[#81C784] border-[#81C784] text-white'
                : 'border-[#FF8A65] hover:bg-[#FFF3E0] hover:scale-110'
            }`}
          >
            {todo.is_completed && <Check className="w-3 h-3" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Index & Title */}
            <div className="flex items-center gap-1.5 mb-0.5">
              {index !== undefined && (
                <span className="text-xs font-medium text-[#8D6E63] bg-[#FFF8F0] px-1.5 py-0.5 rounded">
                  #{index}
                </span>
              )}
              <h3
                className={`text-sm font-semibold ${
                  todo.is_completed ? 'line-through text-gray-400' : 'text-[#5D4037]'
                }`}
              >
                {todo.title}
              </h3>
            </div>

            {/* Description */}
            {todo.description && (
              <p className="text-xs text-[#8D6E63] mb-1 line-clamp-1">{todo.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Time */}
              <div className="flex items-center gap-0.5 text-[#8D6E63]">
                <Clock className="w-3 h-3" />
                <span>{formatTimeRange()}</span>
              </div>

              {/* Category */}
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: categoryInfo.bgColor,
                  color: categoryInfo.color,
                }}
              >
                {categoryInfo.emoji} {categoryInfo.label}
              </span>

              {/* Feeling */}
              {todo.feeling && !showFeelings && (
                <span className="text-xs text-[#81C784]">💭 {todo.feeling}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onEdit(todo)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[#8D6E63]"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(todo.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Feelings Modal */}
      {showFeelings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFeelings(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#5D4037]">
                完成「{todo.title}」✨
              </h3>
              <button
                onClick={() => setShowFeelings(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-[#8D6E63]" />
              </button>
            </div>

            <p className="text-sm text-[#8D6E63] mb-4">现在感觉怎么样？</p>

            {/* Feeling Options */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {FEELINGS.map((feeling) => (
                <button
                  key={feeling.type}
                  onClick={() => handleFeelingSelect(feeling.type)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#FFF8F0] transition-colors"
                >
                  <span className="text-2xl">{feeling.emoji}</span>
                  <span className="text-xs text-[#8D6E63]">{feeling.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Feeling */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customFeeling}
                onChange={(e) => setCustomFeeling(e.target.value)}
                placeholder="输入自定义感受..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8A65] focus:border-transparent"
              />
              <Button
                size="sm"
                onClick={() => handleFeelingSelect('custom')}
                disabled={!customFeeling.trim()}
              >
                记录
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TodoItem;
