# Calendar-count

## Description

A web-based calendar activity tracker and task manager. Create and manage long term tasks by dividing and assigning them to calendar days.

## Tech Stack

- React
- Firebase
- FastAPI

## Database Structure

The application uses Google Cloud Firestore with the following collections:

### Users Collection
```
users/
  ├── [user-email]
  │   ├── name: [string]
  │   ├── email: [string]
  │   ├── avatar: [string]
  │   ├── createdAt: [timestamp]
  │   ├── preferences: [map]
  │   ├── tags: [array]
  │   ├── completionRate: [double]
  │   └── lastLogin: [timestamp]
```

### Events Collection
```
events/
  ├── [event-id]
  │   ├── title: [string]
  │   ├── description: [string]
  │   ├── date: [date]
  │   ├── startTime: [time]
  │   ├── endTime: [time]
  │   ├── type: [string]
  │   ├── color: [string]
  │   └── createdBy: [string]
```

### Tasks Collection
```
tasks/
  ├── [task-id]
  │   ├── title: [string]
  │   ├── description: [string]
  │   ├── status: [string]
  │   ├── priority: [string]
  │   ├── createdBy: [string]
  │   ├── createdAt: [timestamp]
  │   ├── dueDate: [date]
  │   └── subTasks: [array]
```

### Progress Collection
```
progress/
  ├── [task-id]-[date]
  │   ├── taskId: [string]
  │   ├── date: [date]
  │   ├── hoursWorked: [number]
  │   ├── workDone: [string]
  │   ├── nextSteps: [string]
  │   └── completed: [boolean]
```

### Assignments Collection
```
assignments/
  ├── [task-id]-[event-date]
  │   ├── taskId: [string]
  │   ├── eventDate: [date]
  │   ├── assignedTo: [string]
  │   ├── hoursRequired: [number]
  │   ├── status: [string]
  │   └── eventRef: [string]
```

## Features

- Calendar view of activities and tasks
- Break long term tasks into smaller parts
- Assign tasks to specific calendar days
- Track task progress

## Preview

## Run locally

### Prerequisites

- Python 3.14 and Node.js 22 (the versions CI uses)
- A Firebase project with:
  - **Authentication**: Email/Password and Google providers enabled, and `localhost` in Authorized domains
  - **Firestore** database created
  - A **web app** registered (Project settings > General) for the frontend config
  - A **service account key** (Project settings > Service accounts > Generate new private key) for the backend

### 1. Configure

```bash
cp .env.example .env
```

Fill in `.env` at the repo root; both the frontend and backend read it.

- `VITE_FIREBASE_*`: values from your Firebase web app config.
- `GOOGLE_APPLICATION_CREDENTIALS`: absolute path to the service account JSON. You can save it in the repo root as `firebase-adminsdk.json`, which is gitignored. Never commit it.
- `CORS_ORIGINS`: keep `http://localhost:5173` for local dev.
- `VITE_API_URL`: optional; defaults to `http://localhost:8000`.

### 2. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload
```

The API runs at http://localhost:8000. Check that http://localhost:8000/health returns `{"status":"ok"}`.

### 3. Frontend (React + Vite)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, then sign up or sign in.

### Tests and lint

```bash
cd backend && .venv/bin/pytest && .venv/bin/ruff check .
cd frontend && npm test && npm run lint && npm run build
```

Tests use a fake Firestore and mocked Firebase, so they need no credentials.

### Troubleshooting

- **"Can't reach the server" / "Failed to fetch"**: the backend isn't running on port 8000, or `CORS_ORIGINS` doesn't include the frontend URL.
- **503 "set GOOGLE_APPLICATION_CREDENTIALS"**: the service account path in `.env` is missing or wrong.
- **401 on every request**: `VITE_FIREBASE_PROJECT_ID` is not set (the backend uses it to verify sign-in tokens).
- After editing `.env`, restart both servers.
