import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, UserPlus, LogOut, Moon, Sun, 
  LayoutDashboard, CheckSquare, User, 
  PlusCircle, Loader2, ChevronLeft, ChevronRight,
  ClipboardList, Info, Key, Mail, RefreshCw
} from 'lucide-react';

import { User as UserType, Task, DashboardStats, TaskFilters } from './types';
import { api, getToken, logoutUser } from './utils/api';
import { connectSocket, disconnectSocket, getSocket } from './utils/socket';

// Components
import { ToastContainer, ToastMessage } from './components/Toast';
import { DashboardStatsCards } from './components/DashboardStatsCards';
import { TaskFiltersBar } from './components/TaskFiltersBar';
import { TaskCard } from './components/TaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskDetailModal } from './components/TaskDetailModal';

export default function App() {
  // Authentication & session state
  const [user, setUser] = useState<UserType | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form parameters
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App workspace view state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'profile'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [tasksLoading, setTasksLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({ sortBy: 'latest' });
  const [darkMode, setDarkMode] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Toast Notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Show dynamic toast helper
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Light/Dark Theme Setup
  useEffect(() => {
    const mode = localStorage.getItem('task_manager_dark_mode') === 'true';
    setDarkMode(mode);
    if (mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem('task_manager_dark_mode', String(nextMode));
    if (nextMode) {
      document.documentElement.classList.add('dark');
      addToast('Dark mode activated', 'info');
    } else {
      document.documentElement.classList.remove('dark');
      addToast('Light mode activated', 'info');
    }
  };

  // Auth bootstrap on load
  useEffect(() => {
    const token = getToken();
    if (token) {
      api.auth.getProfile()
        .then((res) => {
          setUser(res.user);
          setIsAuthenticated(true);
          // Establish WebSocket channel
          connectSocket();
          setupSocketListeners(res.user.id);
          addToast(`Session recovered. Welcome back, ${res.user.name}!`, 'success');
        })
        .catch(() => {
          logoutUser();
          setUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setInitLoading(false);
        });
    } else {
      setInitLoading(false);
    }
  }, []);

  // Fetch current statistics and tasks on authenticate
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
      fetchStats();
    }
  }, [isAuthenticated, filters]);

  // Fetch tasks helper
  const fetchTasks = async () => {
    try {
      setTasksLoading(true);
      const res = await api.tasks.getAll(filters);
      setTasks(res.tasks);
    } catch (err: any) {
      addToast(err.message || 'Could not fetch tasks.', 'error');
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch stats helper
  const fetchStats = async () => {
    try {
      const res = await api.dashboard.getStats();
      setStats(res.stats);
    } catch {
      // Slient error
    }
  };

  // Setup client listeners for real-time changes
  const setupSocketListeners = (userId: string) => {
    const socket = getSocket();
    
    // Idempotent task creation listener
    socket.on('task_created', (newTask: Task) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
      fetchStats();
      addToast(`Real-time: Task "${newTask.title}" has been created!`, 'info');
    });

    // Task update listener
    socket.on('task_updated', (updatedTask: Task) => {
      setTasks((prev) => {
        return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      });
      fetchStats();
      addToast(`Real-time: Task "${updatedTask.title}" has been updated.`, 'info');
    });

    // Task deletion listener
    socket.on('task_deleted', (payload: { id: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== payload.id));
      fetchStats();
      addToast('Real-time: A task was removed from workspace.', 'info');
    });
  };

  // Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'register') {
        if (!name.trim()) throw new Error('Registration failed: Full Name is required.');
        if (password !== confirmPassword) throw new Error('Registration failed: Passwords do not match.');
        
        const data = await api.auth.register({ name: name.trim(), email: email.trim(), password, confirmPassword });
        setUser(data.user);
        setIsAuthenticated(true);
        connectSocket();
        setupSocketListeners(data.user.id);
        addToast(`Welcome to your workspace, ${data.user.name}!`, 'success');
      } else {
        const data = await api.auth.login({ email: email.trim(), password });
        setUser(data.user);
        setIsAuthenticated(true);
        connectSocket();
        setupSocketListeners(data.user.id);
        addToast(`Successfully log in. Welcome back, ${data.user.name}!`, 'success');
      }

      // Reset values
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
      addToast(err.message || 'Auth failure.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    disconnectSocket();
    setUser(null);
    setIsAuthenticated(false);
    setTasks([]);
    setStats({ total: 0, pending: 0, inProgress: 0, completed: 0 });
    addToast('You have successsfully logged out.', 'success');
  };

  // Task Operations
  const handleCreateOrUpdateTask = async (taskData: Partial<Task>) => {
    if (selectedTask) {
      // Editing
      const res = await api.tasks.update(selectedTask.id, taskData);
      // update state
      setTasks((prev) => prev.map((t) => (t.id === res.task.id ? res.task : t)));
      fetchStats();
      addToast(`Task "${res.task.title}" updated successfully`, 'success');
    } else {
      // Creating
      const res = await api.tasks.create(taskData);
      // update state
      setTasks((prev) => [res.task, ...prev]);
      fetchStats();
      addToast(`Task "${res.task.title}" created successfully`, 'success');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.tasks.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      fetchStats();
      addToast('Task removed from workspace', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete task', 'error');
    }
  };

  const handleStatusToggle = async (task: Task) => {
    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      const res = await api.tasks.update(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === res.task.id ? res.task : t)));
      fetchStats();
      addToast(`Task "${task.title}" marked as ${nextStatus === 'completed' ? 'Completed' : 'Pending'}`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle progress status', 'error');
    }
  };

  // Filter actions
  const handleFilterChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Back to page 1 on search filter change
  };

  const handleFilterReset = () => {
    setFilters({ sortBy: 'latest' });
    setCurrentPage(1);
    addToast('All filters have been reset', 'info');
  };

  // Pagination bounds
  const totalPages = Math.ceil(tasks.length / itemsPerPage) || 1;
  const paginatedTasks = tasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Get user avatar abbreviation
  const getAvatarLetter = () => {
    if (!user || !user.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Render initial loader
  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-zinc-900 dark:text-zinc-100 animate-spin" />
          <span className="text-sm font-semibold tracking-wider uppercase opacity-80 animate-pulse text-zinc-500">
            Initializing workspace...
          </span>
        </div>
      </div>
    );
  }

  // Auth Panels screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 transition-colors flex flex-col justify-between py-10 px-4">
        {/* Floating notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Brand Header */}
        <div className="w-full max-w-sm mx-auto text-center flex flex-col items-center gap-2 mt-4">
          <div className="p-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl shadow-sm mb-1.5">
            <CheckSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            Task Management Systems
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Synchronized planning on a dynamic backend infrastructure
          </p>
        </div>

        {/* Auth Forms card */}
        <div className="w-full max-w-md mx-auto my-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-lg p-7 sm:p-9 relative overflow-hidden">
          {/* Form Switch tabs */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800/80 mb-6">
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition relative cursor-pointer ${
                authMode === 'login' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              Sign In Account
              {authMode === 'login' && (
                <motion.div layoutId="activeAuthUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
              )}
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition relative cursor-pointer ${
                authMode === 'register' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              Register New Users
              {authMode === 'register' && (
                <motion.div layoutId="activeAuthUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
              )}
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            {authError && (
              <div id="auth-error" className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs sm:text-sm font-semibold leading-relaxed flex items-start gap-2.5">
                <Info className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {/* Full Name (Registration Only) */}
            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Carter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter secure password (6+ chars)..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
                />
              </div>
            </div>

            {/* Confirm Password (Registration Only) */}
            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                  <input
                    type="password"
                    required
                    placeholder="Verify password match..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={authLoading}
              className="mt-2 w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  Sign In Account
                </>
              ) : (
                <>
                  <UserPlus className="w-4.5 h-4.5" />
                  Register New Member
                </>
              )}
            </button>
          </form>
        </div>

        {/* Toggle dark mode while on auth pages */}
        <div className="w-full text-center flex justify-center items-center gap-4 text-xs font-semibold tracking-wider text-zinc-400">
          <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-zinc-600" />}
            <span>Theme Toggle</span>
          </button>
        </div>
      </div>
    );
  }

  // Dashboard / Workspace Screens
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 transition-colors duration-250 flex flex-col">
      {/* Toast banners */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Main Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-sm">
              <CheckSquare className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-lg block">
                Task Workspace
              </span>
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                Production Node
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switching Navigation */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'dashboard' 
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
              
              <button
                onClick={() => setCurrentTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'profile' 
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                User Profile
              </button>
            </div>

            {/* Dark mode */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-805 transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer"
              title="Toggle theme mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div 
                onClick={() => setCurrentTab('profile')}
                className="w-8.5 h-8.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer hover:opacity-85 transition"
                title="View user profile"
              >
                {getAvatarLetter()}
              </div>
              <button
                onClick={handleLogout}
                className="hidden md:flex p-2 rounded-xl text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                title="Logout from workspace"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-8">
        <AnimatePresence mode="wait">
          {currentTab === 'dashboard' ? (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-8"
            >
              {/* Dashboard Hero Header */}
              <div className="sm:flex sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                    Welcome back, {user?.name}!
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                    Manage and synchronize your deliverables in absolute real-time.
                  </p>
                </div>
                
                <button
                  id="add-task-btn"
                  onClick={() => {
                    setSelectedTask(null);
                    setIsFormOpen(true);
                  }}
                  className="mt-4 sm:mt-0 px-5 py-2.5 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-5 h-5" />
                  Add New Task
                </button>
              </div>

              {/* Summary Cards */}
              <DashboardStatsCards stats={stats} />

              {/* Filtering Controls */}
              <TaskFiltersBar 
                filters={filters} 
                onFilterChange={handleFilterChange} 
                onReset={handleFilterReset} 
              />

              {/* Tasks List Grid view section */}
              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-bold text-lg tracking-tight text-zinc-950 dark:text-zinc-100">
                    Task Workspace ({tasks.length})
                  </h3>
                  {tasksLoading && <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />}
                </div>

                {tasksLoading && tasks.length === 0 ? (
                  <div className="min-h-[220px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                    <p className="text-sm text-zinc-500 mt-2">Loading task rosters...</p>
                  </div>
                ) : paginatedTasks.length === 0 ? (
                  <div className="min-h-[220px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-zinc-500 max-w-md mx-auto w-full gap-3">
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-zinc-400">
                      <ClipboardList className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-base leading-snug">
                        No Tasks Found
                      </p>
                      <p className="text-xs text-zinc-400 font-medium mt-1">
                        Try modifying search syntax, status attributes, or priority select filters.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout animate-none">
                      {paginatedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onView={(t) => {
                            setSelectedTask(t);
                            setIsDetailOpen(true);
                          }}
                          onEdit={(t) => {
                            setSelectedTask(t);
                            setIsFormOpen(true);
                          }}
                          onDelete={handleDeleteTask}
                          onStatusToggle={handleStatusToggle}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Pagination bar controls */}
                {tasks.length > itemsPerPage && (
                  <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-4">
                    <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-855 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-zinc-650 dark:text-zinc-300"
                        title="Prior Page"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-855 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-zinc-650 dark:text-zinc-300"
                        title="Subsequent Page"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // User profile settings tab
            <motion.div
              key="profile-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="max-w-2xl mx-auto w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm p-6 sm:p-8 flex flex-col gap-6"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  User Workspace Profile
                </h2>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                  Manage login credentials and appearance settings.
                </p>
              </div>

              {/* Profile Details Container */}
              <div className="flex flex-col sm:flex-row items-center gap-5 border-t border-b border-zinc-100 dark:border-zinc-800/80 py-6 my-1">
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-2xl shadow-md border border-zinc-200/20 shrink-0 select-none">
                  {getAvatarLetter()}
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {user?.name}
                  </h3>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {user?.email}
                  </p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mt-2">
                    Registered: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Preferences Configuration section Layout */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Aesthetic Controls
                </h4>

                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
                  <div>
                    <span className="text-sm font-semibold block text-zinc-800 dark:text-zinc-200">
                      Ambiance Dark Theme
                    </span>
                    <span className="text-xs text-zinc-400">
                      Switch light background matrices to visual safe dark.
                    </span>
                  </div>

                  <button
                    onClick={toggleDarkMode}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-sm text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-zinc-650" />}
                  </button>
                </div>
              </div>

              {/* Direct System Actions */}
              <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800/80 pt-6 mt-2 gap-4">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-4.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  Back to Dashboard
                </button>
                
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 hover:dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Task Creation & Updation Modals Frame */}
      <TaskFormModal
        isOpen={isFormOpen}
        task={selectedTask}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleCreateOrUpdateTask}
      />

      {/* Task Details Inspection Modals Frame */}
      <TaskDetailModal
        isOpen={isDetailOpen}
        task={selectedTask}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onEdit={(t) => {
          setIsDetailOpen(false); // Swap modal
          setIsFormOpen(true);
        }}
      />
    </div>
  );
}
