import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { connectDB, UserService, TaskService } from './src/server/db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_task_manager_secret_123';

// Express body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Socket.io Real-Time connection handling
io.on('connection', (socket) => {
  // Allow client to authenticate and join their private user room
  socket.on('authenticate', (token) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const roomName = `user_${decoded.id}`;
      // Join the private socket room
      socket.join(roomName);
    } catch {
      // Invalid token, ignore
    }
  });

  socket.on('disconnect', () => {
    // standard socket disconnect
  });
});

// Broadcast helper
function notifyUserTaskUpdate(userId: string, eventType: 'task_created' | 'task_updated' | 'task_deleted', task: any) {
  io.to(`user_${userId}`).emit(eventType, task);
}

// Authentication Middleware
const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token missing' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await UserService.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found or session expired' });
    }

    // Attach basic user info to request
    (req as any).user = {
      id: user.id || user._id.toString(),
      name: user.name,
      email: user.email
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ==========================================
// API ROUTES
// ==========================================

// AUTH: USER REGISTRATION
app.post('/api/auth/register', async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = await UserService.createUser({
      name,
      email,
      password: hashedPassword
    });

    const userId = newUser.id || newUser._id.toString();

    // Create JWT Token
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (err: any) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Internal server error while register user' });
  }
});

// AUTH: USER LOGIN
app.post('/api/auth/login', async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await UserService.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email address or password' });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email address or password' });
    }

    const userId = user.id || user._id.toString();

    // Create JWT Token
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal server error while login user' });
  }
});

// GET CURRENT USER PROFILE
app.get('/api/auth/me', authenticateToken, async (req: any, res: express.Response) => {
  res.json({ user: req.user });
});

// TASKS: READ TASKS (WITH FILTERS AND SORTING)
app.get('/api/tasks', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const filters = {
      status: req.query.status || '',
      priority: req.query.priority || '',
      search: req.query.search || '',
      sortBy: req.query.sortBy || 'latest'
    };

    const tasks = await TaskService.findByUserId(req.user.id, filters);
    res.json({ tasks });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// TASKS: READ SINGLE TASK DETAIL
app.get('/api/tasks/:id', authenticateToken, async (req: any, res: express.Response): Promise<any> => {
  try {
    const task = await TaskService.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check ownership
    const taskOwnerId = task.userId.toString();
    if (taskOwnerId !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to view this task' });
    }

    res.json({ task });
  } catch (err) {
    console.error('Fetch single task error:', err);
    res.status(500).json({ error: 'Failed to retrieve task detail' });
  }
});

// TASKS: CREATE NEW TASK
app.post('/api/tasks', authenticateToken, async (req: any, res: express.Response): Promise<any> => {
  try {
    const { title, description, priority, status, dueDate } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Title and due date are required fields' });
    }

    const newTask = await TaskService.createTask({
      title,
      description: description || '',
      priority: priority || 'medium',
      status: status || 'pending',
      dueDate,
      userId: req.user.id
    });

    // Real-Time notification
    notifyUserTaskUpdate(req.user.id, 'task_created', newTask);

    res.status(201).json({ task: newTask });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create new task' });
  }
});

// TASKS: UPDATE EXISTING TASK
app.put('/api/tasks/:id', authenticateToken, async (req: any, res: express.Response): Promise<any> => {
  try {
    const { title, description, priority, status, dueDate } = req.body;

    const task = await TaskService.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check ownership
    const taskOwnerId = task.userId.toString();
    if (taskOwnerId !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to modify this task' });
    }

    const updatedTask = await TaskService.updateTask(req.params.id, {
      title,
      description,
      priority,
      status,
      dueDate
    });

    if (!updatedTask) {
      return res.status(500).json({ error: 'Failed to update task record' });
    }

    // Real-Time notification
    notifyUserTaskUpdate(req.user.id, 'task_updated', updatedTask);

    res.json({ task: updatedTask });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task record' });
  }
});

// TASKS: DELETE TASK
app.delete('/api/tasks/:id', authenticateToken, async (req: any, res: express.Response): Promise<any> => {
  try {
    const task = await TaskService.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check ownership
    const taskOwnerId = task.userId.toString();
    if (taskOwnerId !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this task' });
    }

    const success = await TaskService.deleteTask(req.params.id);
    if (!success) {
      return res.status(500).json({ error: 'Could not delete task item' });
    }

    // Real-Time notification
    notifyUserTaskUpdate(req.user.id, 'task_deleted', { id: req.params.id });

    res.json({ message: 'Task deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task item' });
  }
});

// GET DASHBOARD STATS
app.get('/api/dashboard/stats', authenticateToken, async (req: any, res: express.Response) => {
  try {
    const tasks = await TaskService.findByUserId(req.user.id);
    
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };

    res.json({ stats });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// ==========================================
// VITE AND STATIC ASSETS HANDLERS
// ==========================================

async function initializeApp() {
  // Connect to database
  await connectDB();

  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite developmental server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production serving of frontend static build artifacts
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start HTTP / WS Server
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Task Server] Running at http://localhost:${PORT}`);
  });
}

initializeApp().catch((err) => {
  console.error('Critical Server Initialization Failure:', err);
});
