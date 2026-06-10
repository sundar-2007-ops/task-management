import React from 'react';
import { motion } from 'motion/react';
import { Calendar, AlertTriangle, Eye, Edit3, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusToggle: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onView,
  onEdit,
  onDelete,
  onStatusToggle,
}) => {
  // Format dates nicely
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Check if task is overdue
  const isOverdue = () => {
    try {
      if (task.status === 'completed') return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate);
      return due < today;
    } catch {
      return false;
    }
  };

  // Dynamic priority details
  const priorityConfig = {
    high: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40',
      bullet: 'bg-rose-500'
    },
    medium: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
      bullet: 'bg-amber-500'
    },
    low: {
      bg: 'bg-zinc-50 dark:bg-zinc-900/30',
      text: 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
      bullet: 'bg-zinc-500'
    }
  };

  // Dynamic status details
  const statusConfig = {
    completed: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      text: 'Completed'
    },
    in_progress: {
      bg: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/30',
      text: 'In Progress'
    },
    pending: {
      bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      text: 'Pending'
    }
  };

  const priority = task.priority || 'medium';
  const status = task.status || 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`bg-white dark:bg-zinc-900 border ${
        isOverdue() 
          ? 'border-rose-300 dark:border-rose-900/70 shadow-rose-50/50 dark:shadow-rose-950/10' 
          : 'border-zinc-200 dark:border-zinc-800'
      } p-5 rounded-2xl shadow-sm transition hover:shadow-md flex flex-col justify-between h-full group`}
      id={`task-card-${task.id}`}
    >
      <div>
        {/* Priority & Status Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border flex items-center gap-1.5 ${priorityConfig[priority].text} ${priorityConfig[priority].bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[priority].bullet}`} />
            {priority}
          </span>
          
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig[status].bg}`}>
            {statusConfig[status].text}
          </span>
        </div>

        {/* Task Title with Complete/Checkbox controls */}
        <div className="flex items-start gap-2.5 mb-2">
          <button
            onClick={() => onStatusToggle(task)}
            className="mt-1 transition-colors text-zinc-400 hover:text-emerald-500 shrink-0 cursor-pointer"
            title={task.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-emerald-500" />
            )}
          </button>
          
          <h4 className={`font-semibold text-base tracking-tight leading-snug text-zinc-800 dark:text-zinc-100 ${
            task.status === 'completed' ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
          }`}>
            {task.title}
          </h4>
        </div>

        {/* Shortened Description */}
        <p className={`text-sm text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2 leading-relaxed ${
          task.status === 'completed' ? 'opacity-60' : ''
        }`}>
          {task.description || 'No description provided.'}
        </p>
      </div>

      {/* Footer Details & Visual Actions */}
      <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <Calendar className="w-3.5 h-3.5" />
          <span className={`${isOverdue() ? 'text-rose-500 dark:text-rose-400 font-semibold' : ''}`}>
            {formatDate(task.dueDate)}
          </span>
          {isOverdue() && (
            <span className="flex items-center gap-1 text-rose-500 font-medium ml-1.5">
              <AlertTriangle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        {/* Actions Button Bar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onView(task)}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Edit Task"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this task?')) {
                onDelete(task.id);
              }
            }}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
