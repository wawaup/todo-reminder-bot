import React, { useState, useMemo } from 'react';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TodoItem, TodoForm } from './components/TodoItem';
import { CalendarView } from './components/Calendar';
import { Button } from './components/common';
import { useTodos, useFilteredTodos } from './hooks/useTodos';
import { Todo, TodoFormData, ViewType, CATEGORIES } from './types';

function App() {
  const {
    todos,
    loading,
    error,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    completeTodo,
    uncompleteTodo,
  } = useTodos();

  const [viewType, setViewType] = useState<ViewType>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredTodos = useFilteredTodos(todos, viewType, currentDate);

  // Statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayTodos = todos.filter((todo) => {
      const todoDate = new Date(todo.start_time);
      return todoDate >= today && todoDate <= todayEnd;
    });

    const completed = todayTodos.filter((t) => t.is_completed).length;
    const total = todayTodos.length;
    const pending = total - completed;

    // Category breakdown
    const categoryBreakdown = Object.keys(CATEGORIES).map((cat) => ({
      ...CATEGORIES[cat as keyof typeof CATEGORIES],
      count: todayTodos.filter((t) => t.category === cat).length,
    }));

    return { completed, total, pending, categoryBreakdown };
  }, [todos]);

  const handleCreateTodo = async (data: TodoFormData): Promise<boolean> => {
    return await createTodo(data);
  };

  const handleUpdateTodo = async (data: TodoFormData): Promise<boolean> => {
    if (!editingTodo) return false;
    const success = await updateTodo(editingTodo.id, {
      title: data.title,
      description: data.description,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      category: data.category,
    });
    setEditingTodo(null);
    return success;
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setShowForm(true);
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#5D4037]"> 🌟 小管家 Todo</h1>
              <p className="text-sm text-[#8D6E63] mt-1">
                {format(new Date(), 'yyyy年 M月 d日 EEEE', { locale: zhCN })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTodos()}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 text-[#8D6E63] ${loading ? 'animate-spin' : ''}`} />
              </button>

              <Button onClick={() => { setEditingTodo(null); setShowForm(true); }}>
                <Plus className="w-5 h-5 mr-1" />
                新建日程
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Calendar */}
          <div className="lg:col-span-2">
            <CalendarView
              viewType={viewType}
              currentDate={currentDate}
              todos={todos}
              onDateChange={setCurrentDate}
              onViewChange={setViewType}
            />
          </div>

          {/* Right Column - Stats & Today's Todos */}
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl text-center" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
                <div className="text-3xl font-bold text-[#FF8A65]">{stats.total}</div>
                <div className="text-xs text-[#8D6E63] mt-1">今日总计</div>
              </div>
              <div className="bg-white p-4 rounded-2xl text-center" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
                <div className="text-3xl font-bold text-[#81C784]">{stats.completed}</div>
                <div className="text-xs text-[#8D6E63] mt-1">已完成</div>
              </div>
              <div className="bg-white p-4 rounded-2xl text-center" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
                <div className="text-3xl font-bold text-[#FFD54F]">{stats.pending}</div>
                <div className="text-xs text-[#8D6E63] mt-1">待完成</div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white p-4 rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
              <h3 className="text-sm font-semibold text-[#5D4037] mb-3">分类统计</h3>
              <div className="space-y-2">
                {stats.categoryBreakdown.map((cat) => (
                  <div key={cat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ backgroundColor: cat.bgColor }}
                      >
                        {cat.emoji}
                      </span>
                      <span className="text-sm text-[#5D4037]">{cat.label}</span>
                    </div>
                    <span className="text-sm font-medium text-[#8D6E63]">{cat.count} 项</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Todo List */}
            <div className="bg-white p-4 rounded-2xl" style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
              <h3 className="text-sm font-semibold text-[#5D4037] mb-3">
                {viewType === 'day' ? '今日日程' : '当前视图日程'}
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#FF8A65] animate-spin" />
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🌙</div>
                  <p className="text-sm text-[#8D6E63]">暂无日程安排</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => { setEditingTodo(null); setShowForm(true); }}
                  >
                    添加第一个日程
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredTodos.map((todo, idx) => (
                    <div key={todo.id}>
                      <TodoItem
                        todo={todo}
                        index={viewType === 'day' ? idx + 1 : undefined}
                        onComplete={completeTodo}
                        onUncomplete={uncompleteTodo}
                        onEdit={handleEditTodo}
                        onDelete={(id) => setShowDeleteConfirm(id)}
                        compact={viewType !== 'day'}
                      />

                      {/* Delete Confirmation */}
                      {showDeleteConfirm === todo.id && (
                        <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-sm text-red-600 mb-2">确定要删除这个日程吗？</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
                              取消
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteTodo(todo.id)}>
                              删除
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Todo Form Modal */}
      <TodoForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingTodo(null); }}
        onSubmit={editingTodo ? handleUpdateTodo : handleCreateTodo}
        editTodo={editingTodo}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => { setEditingTodo(null); setShowForm(true); }}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#FF8A65] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#F4511E] transition-colors"
        style={{ boxShadow: '0 4px 20px rgba(255, 138, 101, 0.4)' }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

export default App;
