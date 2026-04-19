import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../common';
import { Todo, TodoCategory, TodoFormData, CATEGORIES } from '../../types';
import { formatDateTimeLocal } from '../../lib/supabase';

interface TodoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TodoFormData) => Promise<boolean>;
  editTodo?: Todo | null;
}

export const TodoForm: React.FC<TodoFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editTodo,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<TodoCategory>('daily');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editTodo) {
      setTitle(editTodo.title);
      setDescription(editTodo.description || '');
      setStartTime(formatDateTimeLocal(new Date(editTodo.start_time)));
      setEndTime(formatDateTimeLocal(new Date(editTodo.end_time)));
      setCategory(editTodo.category);
    } else {
      // Reset form for new todo
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15); // Round to next 15 min
      const end = new Date(now);
      end.setHours(end.getHours() + 1);

      setTitle('');
      setDescription('');
      setStartTime(formatDateTimeLocal(now));
      setEndTime(formatDateTimeLocal(end));
      setCategory('daily');
    }
    setErrors({});
  }, [editTodo, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入任务标题';
    }

    if (!startTime) {
      newErrors.startTime = '请选择开始时间';
    }

    if (!endTime) {
      newErrors.endTime = '请选择结束时间';
    }

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      newErrors.endTime = '结束时间必须晚于开始时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    const success = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: startTime,
      end_time: endTime,
      category,
    });

    setLoading(false);

    if (success) {
      onClose();
    }
  };

  const categories = Object.entries(CATEGORIES) as [TodoCategory, (typeof CATEGORIES)[TodoCategory]][];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTodo ? '编辑日程' : '新建日程'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[#5D4037] mb-2">
            任务标题 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入任务标题..."
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8A65] focus:border-transparent transition-all ${
              errors.title ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-400">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[#5D4037] mb-2">
            任务描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="添加任务详情（可选）..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8A65] focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-2">
              开始时间 <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8A65] focus:border-transparent transition-all ${
                errors.startTime ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-400">{errors.startTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5D4037] mb-2">
              结束时间 <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8A65] focus:border-transparent transition-all ${
                errors.endTime ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-400">{errors.endTime}</p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[#5D4037] mb-2">
            任务分类 <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  category === key
                    ? 'border-[#FF8A65] bg-[#FFF3E0]'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: info.bgColor }}
                >
                  {info.emoji}
                </span>
                <span className="text-sm font-medium text-[#5D4037]">
                  {info.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            取消
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {editTodo ? '保存修改' : '创建日程'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TodoForm;
