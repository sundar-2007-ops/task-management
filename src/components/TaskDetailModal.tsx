import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, AlertTriangle, Clock, CalendarDays, Clipboard } from 'lucide-react';
import { Task } from '../types';

interface TaskDetailModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  task,
  onClose,
  onEdit,
}) => {
  if (!task) return null;

  // Formatted date utils
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Check if overdue
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

  // Status specifications
  const statusDetails = {
    pending: {
      bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      label: 'Pending Review'
    },
    in_progress: {
      bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      label: 'Active In Progress'
    },
    completed: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      label: 'Completed Verification'
    }
  };

  // Priority specifications
  const priorityDetails = {
    high: {
      bg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-905/30',
      bullet: 'bg-rose-500'
    },
    medium: {
      bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-905/30',
      bullet: 'bg-amber-505'
    },
    low: {
      bg: 'bg-zinc-100 dark:bg-zinc-805 text-zinc-630 dark:text-zinc-430 border-zinc-200 dark:border-zinc-805',
      bullet: 'bg-zinc-450'
    }
  };

  const priority = task.priority || 'medium';
  const status = task.status || 'pending';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden pointer-events-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40 animate-none">
              <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                Detailed View
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6">
              {/* Badges row */}
              <div className="flex flex-wrap gap-2.5">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border flex items-center gap-1.5 ${priorityDetails[priority].bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityDetails[priority].bullet}`} />
                  Priority: {priority}
                </span>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${statusDetails[status].bg}`}>
                  {statusDetails[status].label}
                </span>

                {isOverdue() && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-rose-200 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Overdue alert
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-2.5">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                  {task.title}
                </h3>
                
                <div className="bg-zinc-50 dark:bg-zinc-950/25 p-4.5 border border-zinc-150 dark:border-zinc-850 rounded-2xl min-h-[100px] leading-relaxed">
                  <span className="text-xs font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase block mb-2 font-sans">
                    Statement description
                  </span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 select-text whitespace-pre-wrap">
                    {task.description || 'No descriptive context parameters available for this task.'}
                  </p>
                </div>
              </div>

              {/* Schedule Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-zinc-100 dark:border-zinc-800/80 py-4.5 my-1">
                {/* Due Date row */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 block uppercase tracking-wide font-semibold">
                      Due Date
                    </span>
                    <span className={`text-sm font-medium ${isOverdue() ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-zinc-850 dark:text-zinc-200'}`}>
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>

                {/* Created Date row */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 block uppercase tracking-wide font-semibold">
                      Created Date
                    </span>
                    <span className="text-sm font-medium text-zinc-850 dark:text-zinc-200">
                      {formatDate(task.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3.5 mt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-semibold transition cursor-pointer"
                >
                  Close parameters
                </button>
                
                <button
                  onClick={() => {
                    onEdit(task);
                  }}
                  className="px-5.5 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Edit Task Details
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
