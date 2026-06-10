import React from 'react';
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { TaskFilters } from '../types';

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
  onReset: () => void;
}

export const TaskFiltersBar: React.FC<TaskFiltersBarProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, status: e.target.value });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, priority: e.target.value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, sortBy: e.target.value as any });
  };

  const hasActiveFilters = !!(filters.search || filters.status || filters.priority || filters.sortBy !== 'latest');

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex flex-col gap-4">
      {/* Search Input and action header */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
          <input
            id="task-filter-search"
            type="text"
            placeholder="Search tasks by title, description..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Advanced Filter options and dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:items-center gap-3">
        <div className="flex items-center gap-2 md:mr-1">
          <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Filters:
          </span>
        </div>

        {/* Status selection */}
        <div className="flex flex-col gap-1 md:w-44">
          <select
            id="filter-status-select"
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Priority selection */}
        <div className="flex flex-col gap-1 md:w-44">
          <select
            id="filter-priority-select"
            value={filters.priority || ''}
            onChange={handlePriorityChange}
            className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="low">Priority: Low</option>
            <option value="medium">Priority: Medium</option>
            <option value="high">Priority: High</option>
          </select>
        </div>

        {/* Sort option */}
        <div className="flex flex-col gap-1 md:ml-auto md:w-48">
          <select
            id="filter-sort-select"
            value={filters.sortBy || 'latest'}
            onChange={handleSortChange}
            className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer text-right"
          >
            <option value="latest">Sort: Latest Added</option>
            <option value="oldest">Sort: Oldest Added</option>
            <option value="priority_high">Sort: Priority (High → Low)</option>
            <option value="priority_low">Sort: Priority (Low → High)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
