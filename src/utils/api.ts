import { Task, DashboardStats, TaskFilters } from '../types';

const API_BASE_URL = '/api';

export function getToken(): string | null {
  return localStorage.getItem('task_manager_token');
}

export function saveToken(token: string) {
  localStorage.setItem('task_manager_token', token);
}

export function removeToken() {
  localStorage.removeItem('task_manager_token');
}

export function logoutUser() {
  removeToken();
  localStorage.removeItem('task_manager_user');
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export const api = {
  auth: {
    async register(payload: any) {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (data.token) {
        saveToken(data.token);
        localStorage.setItem('task_manager_user', JSON.stringify(data.user));
      }
      return data;
    },

    async login(payload: any) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (data.token) {
        saveToken(data.token);
        localStorage.setItem('task_manager_user', JSON.stringify(data.user));
      }
      return data;
    },

    async getProfile() {
      return await request('/auth/me');
    }
  },

  tasks: {
    async getAll(filters: TaskFilters = {}): Promise<{ tasks: Task[] }> {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      return await request(`/tasks${queryString}`);
    },

    async getById(id: string): Promise<{ task: Task }> {
      return await request(`/tasks/${id}`);
    },

    async create(taskData: Partial<Task>): Promise<{ task: Task }> {
      return await request('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
    },

    async update(id: string, taskData: Partial<Task>): Promise<{ task: Task }> {
      return await request(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
      });
    },

    async delete(id: string): Promise<{ id: string }> {
      return await request(`/tasks/${id}`, {
        method: 'DELETE'
      });
    }
  },

  dashboard: {
    async getStats(): Promise<{ stats: DashboardStats }> {
      return await request('/dashboard/stats');
    }
  }
};
