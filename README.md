# Task Workspace - Real-Time Dashboard ⚡️

A complete, production-ready, full-stack collaborative Task Management Web Application. Built on a container-aware Express + Node.js backend linked with a responsive Tailwind CSS + React.js SPA, implementing secure JWT validation, state synchronization, and dual database support (MongoDB Atlas + offline JSON persistence fallback).

---

## 🎨 Design Concept & Visuals

- **Swiss-Modern Aesthetic**: High contrast off-whites and dark charcoal grays. Uses generous negative spaces, elegant structural outlines, and smooth motion frames.
- **Micro-Animations**: Uses `motion` (by React) for slide-ins, status badge transitions, modal drop-downs, and list pop-outs.
- **Dynamic Theme Ambiance**: Seamlessly switches between high-contrast safe light mode and a twilight dark mode, preserving selection in client `localStorage`.

---

## 🛠 Features Breakdown

### 1. User Authentication
- **Register**: Custom profile setup verifying Name, Email, Password, and Confirmation matches.
- **Login**: Checks passwords securely on the backend using `bcryptjs` and signs cryptographically secure JSON Web Tokens (JWT).
- **Session Restoration**: Authenticates stored tokens asynchronously on workspace load, routing directly to private dashboards. This is achieved without exposing secrets.
- **Profile Controls**: Users can review registration metadata, track their custom initials avatar, and configure light/dark settings.

### 2. Dashboard Analytics
- Displays four responsive count indicators:
  - **Total Tasks**: Overall deliverables in scope.
  - **Pending**: Count of tasks that have not yet started.
  - **In Progress**: Count of active task states.
  - **Completed**: Count of finished tasks with a dynamic progress bar showcasing velocity percentage.

### 3. Comprehensive CRUD & Filtering Options
- **Create**: Add a task with a Title, Description, Priority tier (Low, Medium, High), and a Due Date.
- **Read**: Quick detailed inspect popup modal showing created history metadata.
- **Update**: Modal updating task titles, descriptions, due dates, priority tiers, or status options.
- **Delete**: Instant deletion of tasks with active prompt guards.
- **Filtration**: Full-text keyword searches with instant filters for status categories, priority tiers, and sort directions.
- **Pagination**: Structured pagination (6 tasks per screen) preventing layout spillages.

### 4. Real-Time Socket.io Synchronization
- Connected browsers instantly hear changes from other screens!
- When a task is **Created**, **Updated**, or **Deleted**, the server broadcasts a corresponding payload to the owner's isolated WebSockets private channel, refreshing lists and counts instantly without page reloads.

---

## 💾 Dual Database Support (MongoDB or Local Fallback)

To avoid startup crashes and configurations blocks, `/src/server/db.ts` exposes a **Dual Mode Adapter**:
- **Production MongoDB**: Connects to MongoDB Atlas if `MONGODB_URI` exists in `.env` parameters.
- **Offline Local DB**: Falls back to a local, structured, JSON-file database `./task-manager-db.json` with synchronous locks, allowing persistence right out of the box in developmental spaces.

---

## 📂 Project Architecture

```
├── .env.example                # Documented configuration parameters
├── index.html                  # Core HTML file
├── metadata.json               # Developer system configurations
├── package.json                # Project node scripts and library definitions
├── tsconfig.json               # Typescript compilation parameters
├── vite.config.ts              # Vite asset server pipelines
├── server.ts                   # Express server entry point, JWT, Socket.io
└── src
    ├── main.tsx                # SPA load entry point
    ├── index.css               # Tailwind CSS baseline directive
    ├── types.ts                # App TypeScript interfaces
    ├── components
    │   ├── DashboardStatsCards.tsx  # Analytics counters and gauges
    │   ├── TaskCard.tsx             # Task representation containing CRUD actions
    │   ├── TaskFiltersBar.tsx       # Searching, sorting, and filter toggles
    │   ├── TaskFormModal.tsx        # Combined creation and editor popup
    │   ├── TaskDetailModal.tsx      # Multi-field detail inspect card modal
    │   └── Toast.tsx                # Dynamic slide-in floating banner notifications
    └── utils
        ├── api.ts              # Authorization and API request headers wrapper
        └── socket.ts           # Socket.io connection state manager
```

---

## 🚀 Deployment Instructions

### Option A: Defer to Render & Vercel (General Production Stack)

#### Backend Deployment (Render)
1. Sign up on **Render.com** and click **New → Web Service**.
2. Connect your Git repository.
3. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Go to **Environment Variables** and add:
   - `JWT_SECRET` = `[YourPrivateKeyPassphrase]`
   - `MONGODB_URI` = `mongodb+srv://[username]:[password]@cluster.mongodb.net/db?retryWrites=true&w=majority`
   - `NODE_ENV` = `production`
5. Note the primary Web Service URL (e.g., `https://task-backend.onrender.com`).

#### Frontend Deployment (Vercel)
1. Log into **Vercel.com** and click **Add New → Project**.
2. Specify the repository path.
3. Set your **Vite proxy config** or API calls to hit your Render backend endpoint in place of relative paths, then deploy.

### Option B: Unified Deployment (Single Cloud Engine / Cloud Run / VPS)
This codebase is already optimized as a self-contained full-stack container application. You can deploy it as a single unit on **Cloud Run** or a digital server:
1. Specify environment secrets `MONGODB_URI` and `JWT_SECRET`.
2. The server compiles both server and client assets together, serving them seamlessly through port `3000`.

---

## 🛠 Development Setups

To run the application locally or run validation scripts:

```bash
# 1. Install dependencies
npm install

# 2. Run developer environment
npm run dev

# 3. Clean local file DB assets
npm run clean

# 4. Check typescript compiler and lint guidelines
npm run lint

# 5. Build full production build
npm run build
```
