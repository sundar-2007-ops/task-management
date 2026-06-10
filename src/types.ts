export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  userId: string;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  sortBy?: 'latest' | 'oldest' | 'priority_high' | 'priority_low';
}
