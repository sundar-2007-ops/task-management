import React from 'react';
import { motion } from 'motion/react';
import { ClipboardList, CheckCircle, Clock, Disc } from 'lucide-react';
import { DashboardStats } from '../types';

interface DashboardStatsCardsProps {
  stats: DashboardStats;
}

export const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({ stats }) => {
  const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const cardItems = [
    {
      id: 'total',
      title: 'Total Tasks',
      value: stats.total,
      description: 'Acquired in scope',
      color: 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100',
      icon: ClipboardList,
      border: 'border-zinc-200 dark:border-zinc-800'
    },
    {
      id: 'pending',
      title: 'Pending Tasks',
      value: stats.pending,
      description: 'Awaiting priority execution',
      color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
      icon: Clock,
      border: 'border-amber-200/60 dark:border-amber-900/40'
    },
    {
      id: 'in_progress',
      title: 'In Progress Tasks',
      value: stats.inProgress,
      description: 'Active development states',
      color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200',
      icon: Disc,
      border: 'border-blue-200/60 dark:border-blue-900/40'
    },
    {
      id: 'completed',
      title: 'Completed Tasks',
      value: stats.completed,
      description: `${completionPercentage}% project velocity`,
      color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200',
      icon: CheckCircle,
      border: 'border-emerald-200/60 dark:border-emerald-900/40'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardItems.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`p-5 rounded-2xl border ${card.border} ${card.color} shadow-sm flex flex-col justify-between`}
            id={`stats-card-${card.id}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase opacity-70">
                  {card.title}
                </span>
                <h3 className="text-3xl font-bold tracking-tight mt-1">
                  {card.value}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                <Icon className="w-5 h-5 opacity-90" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs opacity-75">{card.description}</span>
              {card.id === 'completed' && (
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
