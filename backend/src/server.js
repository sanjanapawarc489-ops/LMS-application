import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import MockDatabase from "./mockDb.js";

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

let pool;
let isMock = false;

try {
  const dbUrl = new URL(process.env.DB_URL);
  pool = mysql.createPool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port),
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.substring(1),
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log("MySQL connection pool created");
} catch (err) {
  console.warn("MySQL pool creation failed (possibly invalid URL or DNS). Falling back to MockDatabase.");
  pool = new MockDatabase();
  isMock = true;
}

app.use(cors());
app.use(express.json());

async function initDb() {
  console.log("Initializing database tables...");

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Users table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        thumbnail_url VARCHAR(500) NOT NULL,
        instructor_name VARCHAR(255) NOT NULL,
        short_description TEXT NOT NULL,
        description TEXT NOT NULL,
        what_you_will_learn TEXT NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Courses table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        position INT NOT NULL DEFAULT 1,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);
    console.log("Sections table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        youtube_video_id VARCHAR(100) NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 0,
        position INT NOT NULL DEFAULT 1,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
      )
    `);
    console.log("Lessons table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);
    console.log("Enrollments table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        lesson_id INT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE(user_id, lesson_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      )
    `);
    console.log("Progress table ready");
  } catch (err) {
    console.error("Error in initDb:", err);
    throw err;
  }
}

async function seedDb() {
  const [userCountRows] = await pool.query("SELECT COUNT(*) AS c FROM users");
  if (userCountRows[0].c === 0) {
    const hash = await bcrypt.hash("password123", 10);
    await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      ["Demo Student", "student@lms.dev", hash, "student"]
    );
    const adminHash = await bcrypt.hash("admin123", 10);
    await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      ["Demo Admin", "admin@lms.dev", adminHash, "admin"]
    );
  }

  const [courseCountRows] = await pool.query("SELECT COUNT(*) AS c FROM courses");
  if (courseCountRows[0].c > 0) return;

  const courses = [
    {
      title: "Java Fundamentals",
      thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800",
      instructor: "Ravi Kumar",
      short: "Start Java from scratch and build strong OOP basics.",
      description: "Learn Java syntax, OOP, collections, exception handling, and practical coding patterns.",
      outcomes: "Java syntax and types;Object-oriented programming;Collections framework;Exception handling;Mini project",
      sections: [
        {
          title: "Getting Started",
          lessons: [
            { title: "Java Setup and First Program", videoId: "eIrMbAQSU34", duration: 12 },
            { title: "Variables and Data Types", videoId: "l9AzO1FMgM8", duration: 15 }
          ]
        },
        {
          title: "Core Concepts",
          lessons: [
            { title: "Control Flow", videoId: "Qgl81fPcLc8", duration: 18 },
            { title: "OOP in Java", videoId: "xk4_1vDrzzo", duration: 20 }
          ]
        }
      ]
    },
    {
      title: "Python for Beginners",
      thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800",
      instructor: "Ananya Singh",
      short: "Learn Python quickly for scripting, data, and backend basics.",
      description: "Master Python fundamentals, functions, modules, and practical scripts.",
      outcomes: "Python syntax;Functions and modules;File handling;Error handling;Practical scripting",
      sections: [
        {
          title: "Python Basics",
          lessons: [
            { title: "Intro to Python", videoId: "kqtD5dpn9C8", duration: 13 },
            { title: "Lists and Dictionaries", videoId: "W8KRzm-HUcc", duration: 16 }
          ]
        },
        {
          title: "Intermediate",
          lessons: [
            { title: "Functions Deep Dive", videoId: "9Os0o3wzS_I", duration: 14 },
            { title: "File Handling", videoId: "Uh2ebFW8OYM", duration: 11 }
          ]
        }
      ]
    },
    {
      title: "Machine Learning Essentials",
      thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800",
      instructor: "Dr. Meera Shah",
      short: "Understand ML workflow, model training, and evaluation.",
      description: "Build ML intuition with supervised learning, preprocessing, and evaluation metrics.",
      outcomes: "ML pipeline;Data preprocessing;Linear and logistic models;Model evaluation;Overfitting basics",
      sections: [
        {
          title: "ML Foundation",
          lessons: [
            { title: "What is Machine Learning?", videoId: "ukzFI9rgwfU", duration: 10 },
            { title: "Train/Test Split", videoId: "0Lt9w-BxKFQ", duration: 9 }
          ]
        },
        {
          title: "Modeling",
          lessons: [
            { title: "Linear Regression", videoId: "nk2CQITm_eo", duration: 15 },
            { title: "Classification Basics", videoId: "4b4MUYve_U8", duration: 17 }
          ]
        }
      ]
    }
  ];

  for (const course of courses) {
    let totalDuration = 0;
    course.sections.forEach(s => s.lessons.forEach(l => totalDuration += l.duration));

    const [res] = await pool.execute(
      `INSERT INTO courses (title, thumbnail_url, instructor_name, short_description, description, what_you_will_learn, duration_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [course.title, course.thumbnail, course.instructor, course.short, course.description, course.outcomes, totalDuration]
    );
    const courseId = res.insertId;

    for (let i = 0; i < course.sections.length; i++) {
      const section = course.sections[i];
      const [secRes] = await pool.execute(
        "INSERT INTO sections (course_id, title, position) VALUES (?, ?, ?)",
        [courseId, section.title, i + 1]
      );
      const sectionId = secRes.insertId;
      for (let j = 0; j < section.lessons.length; j++) {
        const lesson = section.lessons[j];
        await pool.execute(
          "INSERT INTO lessons (section_id, title, youtube_video_id, duration_minutes, position) VALUES (?, ?, ?, ?, ?)",
          [sectionId, lesson.title, lesson.videoId, lesson.duration, j + 1]
        );
      }
    }
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

async function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

const roleRequired = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  next();
};

const parseWhatYouWillLearn = (val) => val.split(";").map(v => v.trim()).filter(Boolean);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });
  const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) return res.status(409).json({ message: "Email registered" });
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.execute("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')", [name, email, hash]);
  const [user] = await pool.execute("SELECT id, name, email, role FROM users WHERE id = ?", [result.insertId]);
  const token = signToken(user[0]);
  res.status(201).json({ token, user: user[0] });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
  if (!users.length) return res.status(401).json({ message: "Invalid credentials" });
  const user = users[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ token: signToken(safeUser), user: safeUser });
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  const [users] = await pool.execute("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
  if (!users.length) return res.status(404).json({ message: "User not found" });
  res.json({ user: users[0] });
});

app.get("/api/courses", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT c.id, c.title, c.thumbnail_url AS thumbnailUrl, c.instructor_name AS instructorName,
           c.short_description AS shortDescription, c.duration_minutes AS durationMinutes,
           (SELECT COUNT(*) FROM lessons l JOIN sections s ON s.id = l.section_id WHERE s.course_id = c.id) AS totalLessons
    FROM courses c ORDER BY c.id ASC
  `);

  let enrollmentsByCourse = {};
  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET);
      const [enrolled] = await pool.execute("SELECT course_id FROM enrollments WHERE user_id = ?", [payload.id]);
      enrollmentsByCourse = Object.fromEntries(enrolled.map(e => [e.course_id, true]));
    } catch { }
  }
  res.json({ courses: rows.map(c => ({ ...c, isEnrolled: !!enrollmentsByCourse[c.id] })) });
});

app.get("/api/courses/:courseId", async (req, res) => {
  const courseId = req.params.courseId;
  const [courseRows] = await pool.execute("SELECT id, title, thumbnail_url AS thumbnailUrl, instructor_name AS instructorName, short_description AS shortDescription, description, what_you_will_learn AS whatYouWillLearn, duration_minutes AS durationMinutes FROM courses WHERE id = ?", [courseId]);
  if (!courseRows.length) return res.status(404).json({ message: "Course not found" });
  const [sections] = await pool.execute("SELECT id, title, position FROM sections WHERE course_id = ? ORDER BY position ASC", [courseId]);
  const [lessons] = await pool.execute(`
    SELECT l.id, l.section_id AS sectionId, l.title, l.youtube_video_id AS youtubeVideoId, l.duration_minutes AS durationMinutes, l.position
    FROM lessons l JOIN sections s ON s.id = l.section_id WHERE s.course_id = ? ORDER BY s.position ASC, l.position ASC
  `, [courseId]);

  const sectionMap = sections.map(s => ({ ...s, lessons: lessons.filter(l => l.sectionId === s.id) }));
  res.json({ course: { ...courseRows[0], whatYouWillLearn: parseWhatYouWillLearn(courseRows[0].whatYouWillLearn), totalLessons: lessons.length, sections: sectionMap } });
});

app.post("/api/enrollments", authRequired, async (req, res) => {
  const { courseId } = req.body;
  try {
    await pool.execute("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)", [req.user.id, courseId]);
    res.status(201).json({ enrolled: true });
  } catch {
    res.json({ enrolled: true });
  }
});

app.get("/api/enrollments/me", authRequired, async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT c.id, c.title, c.thumbnail_url AS thumbnailUrl, c.instructor_name AS instructorName, c.short_description AS shortDescription
    FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY e.enrolled_at DESC
  `, [req.user.id]);
  res.json({ courses: rows });
});

app.get("/api/courses/:courseId/learn", authRequired, async (req, res) => {
  const courseId = req.params.courseId;
  const [enrollment] = await pool.execute("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?", [req.user.id, courseId]);
  if (!enrollment.length && !isMock) return res.status(403).json({ message: "Enroll first" });

  const [course] = await pool.execute("SELECT id, title, description, duration_minutes AS durationMinutes FROM courses WHERE id = ?", [courseId]);
  const [lessons] = await pool.execute(`
    SELECT l.id, l.title, l.youtube_video_id AS youtubeVideoId, l.duration_minutes AS durationMinutes, s.title AS sectionTitle, s.position AS sectionPosition, l.position
    FROM lessons l JOIN sections s ON s.id = l.section_id WHERE s.course_id = ? ORDER BY s.position ASC, l.position ASC
  `, [courseId]);
  const [progress] = await pool.execute("SELECT lesson_id AS lessonId, completed, last_watched_at AS lastWatchedAt FROM progress WHERE user_id = ? AND course_id = ?", [req.user.id, courseId]);

  const completedLessonIds = progress.filter(p => p.completed).map(p => p.lessonId);
  const lastWatched = [...progress].sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))[0];
  const percentage = lessons.length ? Math.round((completedLessonIds.length / lessons.length) * 100) : 0;

  res.json({ course: course[0], lessons, progress: { completedLessonIds, percentage, lastWatchedLessonId: lastWatched?.lessonId || lessons[0]?.id || null } });
});

app.put("/api/progress/lesson/:lessonId", authRequired, async (req, res) => {
  const lessonId = req.params.lessonId;
  const { courseId, completed = false } = req.body;

  await pool.execute(`
    INSERT INTO progress (user_id, course_id, lesson_id, completed, last_watched_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE completed = VALUES(completed), last_watched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  `, [req.user.id, courseId, lessonId, completed ? 1 : 0]);

  const [[{ total }]] = await pool.execute("SELECT COUNT(*) AS total FROM lessons l JOIN sections s ON s.id = l.section_id WHERE s.course_id = ?", [courseId]);
  const [[{ done }]] = await pool.execute("SELECT COUNT(*) AS done FROM progress WHERE user_id = ? AND course_id = ? AND completed = 1", [req.user.id, courseId]);
  res.json({ ok: true, percentage: total ? Math.round((done / total) * 100) : 0 });
});

app.get("/api/progress/course/:courseId", authRequired, async (req, res) => {
  const courseId = req.params.courseId;
  const [lessons] = await pool.execute("SELECT l.id FROM lessons l JOIN sections s ON s.id = l.section_id WHERE s.course_id = ?", [courseId]);
  const [progress] = await pool.execute("SELECT lesson_id AS lessonId, completed, last_watched_at FROM progress WHERE user_id = ? AND course_id = ?", [req.user.id, courseId]);
  const completedLessonIds = progress.filter(p => p.completed).map(p => p.lessonId);
  const lastWatched = [...progress].sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))[0];
  res.json({ completedLessonIds, percentage: lessons.length ? Math.round((completedLessonIds.length / lessons.length) * 100) : 0, lastWatchedLessonId: lastWatched?.lessonId || null });
});

// Start server
(async () => {
  try {
    await initDb();
    await seedDb();
    console.log("Database initialized and seeded.");
  } catch (err) {
    console.warn("Database initialization failed. Server will continue with limited functionality or mock data.");
    if (!isMock) {
      console.warn("Connection issue detected. Falling back to MockDatabase manually.");
      pool = new MockDatabase();
      isMock = true;
      try {
        await initDb();
        await seedDb();
        console.log("Mock database initialized and seeded.");
      } catch (mockErr) {
        console.error("Critical failure: Mock database also failed.", mockErr);
      }
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LMS backend listening on http://0.0.0.0:${PORT}`);
    if (isMock) console.log("⚠️ RUNNING IN MOCK MODE (In-Memory)");
  });
})();
