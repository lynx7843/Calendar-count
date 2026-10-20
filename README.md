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

