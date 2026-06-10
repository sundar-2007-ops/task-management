import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Setup local JSON database path as fallback
const DB_FILE_PATH = path.join(process.cwd(), 'task-manager-db.json');

// Structure of local DB fallback
interface LocalDBStructure {
  users: any[];
  tasks: any[];
}

// Global variable to track if using local fallback
let isLocalDB = true;

// Mongoose Schemas and Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  dueDate: { type: Date, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

let UserModel: mongoose.Model<any>;
let TaskModel: mongoose.Model<any>;

// Helper to load Local DB
function loadLocalDB(): LocalDBStructure {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      const initial: LocalDBStructure = { users: [], tasks: [] };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading local JSON database:', err);
    return { users: [], tasks: [] };
  }
}

// Helper to save Local DB
function saveLocalDB(data: LocalDBStructure) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local JSON database:', err);
  }
}

// Connect to MongoDB or establish fallback
export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (mongoURI) {
    try {
      console.log('Attempting to connect to MongoDB Atlas...');
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
      });
      isLocalDB = false;
      UserModel = mongoose.model('User', UserSchema);
      TaskModel = mongoose.model('Task', TaskSchema);
      console.log('Successfully connected to MongoDB Atlas!');
    } catch (err) {
      console.error('Failed to connect to MongoDB. Falling back to robust local file database.', err);
      setupLocalDBFallback();
    }
  } else {
    console.log('No MONGODB_URI found in environment parameters. Using robust local file database.');
    setupLocalDBFallback();
  }
}

function setupLocalDBFallback() {
  isLocalDB = true;
  // Initialize DB file if omitted
  loadLocalDB();
}

// Unified Database API
export const UserService = {
  async findByEmail(email: string) {
    if (!isLocalDB) {
      return await UserModel.findOne({ email: email.toLowerCase() });
    } else {
      const db = loadLocalDB();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      return user ? { ...user } : null;
    }
  },

  async findById(id: string) {
    if (!isLocalDB) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      return await UserModel.findById(id);
    } else {
      const db = loadLocalDB();
      const user = db.users.find(u => u.id === id);
      return user ? { ...user } : null;
    }
  },

  async createUser(userData: any) {
    if (!isLocalDB) {
      const newUser = new UserModel({
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: userData.password,
      });
      return await newUser.save();
    } else {
      const db = loadLocalDB();
      const id = 'user_' + Math.random().toString(36).substr(2, 9);
      const newUser = {
        id,
        _id: id,
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: userData.password,
        createdAt: new Date().toISOString()
      };
      db.users.push(newUser);
      saveLocalDB(db);
      return { ...newUser };
    }
  }
};

export const TaskService = {
  async findByUserId(userId: string, filters: any = {}) {
    if (!isLocalDB) {
      const query: any = { userId };
      
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.priority) {
        query.priority = filters.priority;
      }
      if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' };
      }

      let queryExec = TaskModel.find(query);

      // Sorting
      if (filters.sortBy === 'latest') {
        queryExec = queryExec.sort({ createdAt: -1 });
      } else if (filters.sortBy === 'oldest') {
        queryExec = queryExec.sort({ createdAt: 1 });
      } else if (filters.sortBy === 'priority_high') {
        queryExec = queryExec.sort({ priority: 1, createdAt: -1 }); // We will map later or sort in-memory
      } else if (filters.sortBy === 'priority_low') {
        queryExec = queryExec.sort({ priority: -1, createdAt: -1 });
      } else {
        queryExec = queryExec.sort({ createdAt: -1 });
      }

      const tasks = await queryExec.exec();
      return tasks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate.toISOString(),
        userId: t.userId.toString(),
        createdAt: t.createdAt.toISOString()
      }));
    } else {
      const db = loadLocalDB();
      let userTasks = db.tasks.filter(t => t.userId === userId);

      // Filters
      if (filters.status) {
        userTasks = userTasks.filter(t => t.status === filters.status);
      }
      if (filters.priority) {
        userTasks = userTasks.filter(t => t.priority === filters.priority);
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        userTasks = userTasks.filter(t => 
          t.title.toLowerCase().includes(term) || 
          (t.description && t.description.toLowerCase().includes(term))
        );
      }

      // Priority scoring helper
      const priorityWeights = { high: 3, medium: 2, low: 1 };

      // Sorting
      userTasks.sort((a, b) => {
        if (filters.sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (filters.sortBy === 'priority_high') {
          const aWeight = priorityWeights[a.priority as keyof typeof priorityWeights] || 0;
          const bWeight = priorityWeights[b.priority as keyof typeof priorityWeights] || 0;
          if (bWeight !== aWeight) return bWeight - aWeight;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (filters.sortBy === 'priority_low') {
          const aWeight = priorityWeights[a.priority as keyof typeof priorityWeights] || 0;
          const bWeight = priorityWeights[b.priority as keyof typeof priorityWeights] || 0;
          if (aWeight !== bWeight) return aWeight - bWeight;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
          // Default: latest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      return userTasks.map(t => ({
        ...t,
        id: t.id || t._id
      }));
    }
  },

  async findById(id: string) {
    if (!isLocalDB) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const t = await TaskModel.findById(id);
      if (!t) return null;
      return {
        id: t._id.toString(),
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate.toISOString(),
        userId: t.userId.toString(),
        createdAt: t.createdAt.toISOString()
      };
    } else {
      const db = loadLocalDB();
      const task = db.tasks.find(t => t.id === id);
      return task ? { ...task } : null;
    }
  },

  async createTask(taskData: any) {
    if (!isLocalDB) {
      const newTask = new TaskModel({
        title: taskData.title,
        description: taskData.description || '',
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        dueDate: new Date(taskData.dueDate),
        userId: new mongoose.Types.ObjectId(taskData.userId)
      });
      const t = await newTask.save();
      return {
        id: t._id.toString(),
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate.toISOString(),
        userId: t.userId.toString(),
        createdAt: t.createdAt.toISOString()
      };
    } else {
      const db = loadLocalDB();
      const id = 'task_' + Math.random().toString(36).substr(2, 9);
      const newTask = {
        id,
        _id: id,
        title: taskData.title,
        description: taskData.description || '',
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        dueDate: new Date(taskData.dueDate).toISOString(),
        userId: taskData.userId,
        createdAt: new Date().toISOString()
      };
      db.tasks.push(newTask);
      saveLocalDB(db);
      return { ...newTask };
    }
  },

  async updateTask(id: string, taskData: any) {
    if (!isLocalDB) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const updatePayload: any = {};
      if (taskData.title !== undefined) updatePayload.title = taskData.title;
      if (taskData.description !== undefined) updatePayload.description = taskData.description;
      if (taskData.priority !== undefined) updatePayload.priority = taskData.priority;
      if (taskData.status !== undefined) updatePayload.status = taskData.status;
      if (taskData.dueDate !== undefined) updatePayload.dueDate = new Date(taskData.dueDate);

      const t = await TaskModel.findByIdAndUpdate(id, updatePayload, { new: true });
      if (!t) return null;
      return {
        id: t._id.toString(),
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate.toISOString(),
        userId: t.userId.toString(),
        createdAt: t.createdAt.toISOString()
      };
    } else {
      const db = loadLocalDB();
      const idx = db.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      
      const current = db.tasks[idx];
      const updated = {
        ...current,
        title: taskData.title !== undefined ? taskData.title : current.title,
        description: taskData.description !== undefined ? taskData.description : current.description,
        priority: taskData.priority !== undefined ? taskData.priority : current.priority,
        status: taskData.status !== undefined ? taskData.status : current.status,
        dueDate: taskData.dueDate !== undefined ? new Date(taskData.dueDate).toISOString() : current.dueDate,
      };
      
      db.tasks[idx] = updated;
      saveLocalDB(db);
      return { ...updated };
    }
  },

  async deleteTask(id: string) {
    if (!isLocalDB) {
      if (!mongoose.Types.ObjectId.isValid(id)) return false;
      const result = await TaskModel.findByIdAndDelete(id);
      return !!result;
    } else {
      const db = loadLocalDB();
      const initialLength = db.tasks.length;
      db.tasks = db.tasks.filter(t => t.id !== id);
      saveLocalDB(db);
      return db.tasks.length < initialLength;
    }
  }
};
