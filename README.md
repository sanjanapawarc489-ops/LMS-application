# LMS App (React + Express + SQLite)

Learning Management System from a student perspective with YouTube embedded lessons.

## Features

- Course catalog with:
  - Course thumbnail
  - Instructor name
  - Short description
  - Enroll button
- Course details page with:
  - Course description
  - What you will learn
  - Total lessons
  - Total duration
  - Enroll button
- Learning page with:
  - YouTube iframe player (`https://www.youtube.com/embed/{video_id}`)
  - Lesson list sidebar
  - Progress indicator
  - Next / Previous controls
  - Resume from last watched lesson
- Backend:
  - Authentication (register/login with JWT)
  - Authorization middleware
  - Course management APIs
  - Enrollment handling
  - Progress tracking
  - Metadata-only lesson storage (YouTube IDs/URLs, no video files)

## Tech Stack

- Frontend: React + React Router + Vite
- Backend: Node.js + Express
- Database: SQLite (better-sqlite3)

## Project Structure

```text
.
├── backend
│   ├── package.json
│   └── src
│       └── server.js
└── frontend
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src
        ├── App.jsx
        ├── api.js
        ├── main.jsx
        ├── styles.css
        ├── auth.jsx
        ├── components
        │   ├── ProtectedRoute.jsx
        │   └── ShellLayout.jsx
        └── pages
            ├── CourseDetailsPage.jsx
            ├── CoursesPage.jsx
            ├── LearningPage.jsx
            └── LoginPage.jsx
```

## Run Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at [http://localhost:4000](http://localhost:4000).

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at [http://localhost:5173](http://localhost:5173) (or the port Vite shows in terminal, e.g. `5174`).

## Default Demo Accounts

You can register new accounts from UI, or use seeded account:

- Email: `student@lms.dev`
- Password: `password123`
- Admin Email: `admin@lms.dev`
- Admin Password: `admin123`
