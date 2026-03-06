// Vercel Serverless Function - LMS Backend API
// Uses in-memory MockDatabase (no external DB needed)

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "lms-secret-key-vercel";

const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests
app.use(express.json());

// ─── In-Memory Database ───────────────────────────────────────────────────────
class Store {
    constructor() {
        this.users = [];
        this.courses = [];
        this.sections = [];
        this.lessons = [];
        this.enrollments = [];
        this.progress = [];
        this._ids = { users: 0, courses: 0, sections: 0, lessons: 0, enrollments: 0, progress: 0 };
        this._seeded = false;
    }
    nextId(table) { return ++this._ids[table]; }
}

const db = new Store();

// ─── Seed Data ────────────────────────────────────────────────────────────────
async function seed() {
    if (db._seeded) return;
    db._seeded = true;

    // Demo users
    const studentHash = await bcrypt.hash("password123", 8);
    db.users.push({ id: db.nextId("users"), name: "Demo Student", email: "student@lms.dev", password_hash: studentHash, role: "student" });
    const adminHash = await bcrypt.hash("admin123", 8);
    db.users.push({ id: db.nextId("users"), name: "Demo Admin", email: "admin@lms.dev", password_hash: adminHash, role: "admin" });

    // Courses
    const coursesData = [
        {
            title: "Java Fundamentals",
            thumbnail_url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800",
            instructor_name: "Ravi Kumar",
            short_description: "Start Java from scratch and build strong OOP basics.",
            description: "Learn Java syntax, OOP, collections, exception handling, and practical coding patterns.",
            what_you_will_learn: "Java syntax and types;Object-oriented programming;Collections framework;Exception handling;Mini project",
            sections: [
                {
                    title: "Getting Started", lessons: [
                        { title: "Java Setup and First Program", youtube_video_id: "eIrMbAQSU34", duration_minutes: 12 },
                        { title: "Variables and Data Types", youtube_video_id: "l9AzO1FMgM8", duration_minutes: 15 }
                    ]
                },
                {
                    title: "Core Concepts", lessons: [
                        { title: "Control Flow", youtube_video_id: "Qgl81fPcLc8", duration_minutes: 18 },
                        { title: "OOP in Java", youtube_video_id: "xk4_1vDrzzo", duration_minutes: 20 }
                    ]
                }
            ]
        },
        {
            title: "Python for Beginners",
            thumbnail_url: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800",
            instructor_name: "Ananya Singh",
            short_description: "Learn Python quickly for scripting, data, and backend basics.",
            description: "Master Python fundamentals, functions, modules, and practical scripts.",
            what_you_will_learn: "Python syntax;Functions and modules;File handling;Error handling;Practical scripting",
            sections: [
                {
                    title: "Python Basics", lessons: [
                        { title: "Intro to Python", youtube_video_id: "kqtD5dpn9C8", duration_minutes: 13 },
                        { title: "Lists and Dictionaries", youtube_video_id: "W8KRzm-HUcc", duration_minutes: 16 }
                    ]
                },
                {
                    title: "Intermediate", lessons: [
                        { title: "Functions Deep Dive", youtube_video_id: "9Os0o3wzS_I", duration_minutes: 14 },
                        { title: "File Handling", youtube_video_id: "Uh2ebFW8OYM", duration_minutes: 11 }
                    ]
                }
            ]
        },
        {
            title: "Machine Learning Essentials",
            thumbnail_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800",
            instructor_name: "Dr. Meera Shah",
            short_description: "Understand ML workflow, model training, and evaluation.",
            description: "Build ML intuition with supervised learning, preprocessing, and evaluation metrics.",
            what_you_will_learn: "ML pipeline;Data preprocessing;Linear and logistic models;Model evaluation;Overfitting basics",
            sections: [
                {
                    title: "ML Foundation", lessons: [
                        { title: "What is Machine Learning?", youtube_video_id: "ukzFI9rgwfU", duration_minutes: 10 },
                        { title: "Train/Test Split", youtube_video_id: "0Lt9w-BxKFQ", duration_minutes: 9 }
                    ]
                },
                {
                    title: "Modeling", lessons: [
                        { title: "Linear Regression", youtube_video_id: "nk2CQITm_eo", duration_minutes: 15 },
                        { title: "Classification Basics", youtube_video_id: "4b4MUYve_U8", duration_minutes: 17 }
                    ]
                }
            ]
        }
    ];

    for (const c of coursesData) {
        let total = 0;
        c.sections.forEach(s => s.lessons.forEach(l => total += l.duration_minutes));
        const courseId = db.nextId("courses");
        db.courses.push({ id: courseId, title: c.title, thumbnail_url: c.thumbnail_url, instructor_name: c.instructor_name, short_description: c.short_description, description: c.description, what_you_will_learn: c.what_you_will_learn, duration_minutes: total });
        for (let si = 0; si < c.sections.length; si++) {
            const sec = c.sections[si];
            const secId = db.nextId("sections");
            db.sections.push({ id: secId, course_id: courseId, title: sec.title, position: si + 1 });
            for (let li = 0; li < sec.lessons.length; li++) {
                const les = sec.lessons[li];
                db.lessons.push({ id: db.nextId("lessons"), section_id: secId, title: les.title, youtube_video_id: les.youtube_video_id, duration_minutes: les.duration_minutes, position: li + 1 });
            }
        }
    }
}

// Seed on first request
app.use(async (req, res, next) => { await seed(); next(); });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function signToken(user) {
    return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function authRequired(req, res, next) {
    const [, token] = (req.headers.authorization || "").split(" ");
    if (!token) return res.status(401).json({ message: "Missing token" });
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { res.status(401).json({ message: "Invalid token" }); }
}

function getLessonsForCourse(courseId) {
    const secs = db.sections.filter(s => s.course_id == courseId);
    return db.lessons.filter(l => secs.some(s => s.id == l.section_id))
        .map(l => {
            const s = secs.find(s => s.id == l.section_id);
            return { ...l, youtubeVideoId: l.youtube_video_id, durationMinutes: l.duration_minutes, sectionId: l.section_id, sectionTitle: s?.title || "", sectionPosition: s?.position || 0 };
        })
        .sort((a, b) => a.sectionPosition - b.sectionPosition || a.position - b.position);
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true, mode: "mock" }));

// Auth
app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });
    if (db.users.find(u => u.email === email)) return res.status(409).json({ message: "Email registered" });
    const hash = await bcrypt.hash(password, 8);
    const id = db.nextId("users");
    db.users.push({ id, name, email, password_hash: hash, role: "student" });
    const user = { id, name, email, role: "student" };
    res.status(201).json({ token: signToken(user), user });
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const u = db.users.find(u => u.email === email);
    if (!u) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const user = { id: u.id, name: u.name, email: u.email, role: u.role };
    res.json({ token: signToken(user), user });
});

app.get("/api/auth/me", authRequired, (req, res) => {
    const u = db.users.find(u => u.id == req.user.id);
    if (!u) return res.status(404).json({ message: "Not found" });
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

// Courses
app.get("/api/courses", (req, res) => {
    let enrolledSet = {};
    if (req.headers.authorization) {
        try {
            const tok = req.headers.authorization.split(" ")[1];
            const p = jwt.verify(tok, JWT_SECRET);
            db.enrollments.filter(e => e.user_id == p.id).forEach(e => { enrolledSet[e.course_id] = true; });
        } catch { }
    }
    const courses = db.courses.map(c => {
        const lessons = getLessonsForCourse(c.id);
        return { id: c.id, title: c.title, thumbnailUrl: c.thumbnail_url, instructorName: c.instructor_name, shortDescription: c.short_description, durationMinutes: c.duration_minutes, totalLessons: lessons.length, isEnrolled: !!enrolledSet[c.id] };
    });
    res.json({ courses });
});

app.get("/api/courses/:courseId", (req, res) => {
    const c = db.courses.find(c => c.id == req.params.courseId);
    if (!c) return res.status(404).json({ message: "Not found" });
    const secs = db.sections.filter(s => s.course_id == c.id).sort((a, b) => a.position - b.position);
    const lessons = getLessonsForCourse(c.id);
    const sectionsWithLessons = secs.map(s => ({ ...s, lessons: lessons.filter(l => l.sectionId == s.id) }));
    res.json({ course: { id: c.id, title: c.title, thumbnailUrl: c.thumbnail_url, instructorName: c.instructor_name, shortDescription: c.short_description, description: c.description, whatYouWillLearn: c.what_you_will_learn.split(";").map(v => v.trim()).filter(Boolean), durationMinutes: c.duration_minutes, totalLessons: lessons.length, sections: sectionsWithLessons } });
});

// Enrollments
app.post("/api/enrollments", authRequired, (req, res) => {
    const { courseId } = req.body;
    if (!db.enrollments.find(e => e.user_id == req.user.id && e.course_id == courseId)) {
        db.enrollments.push({ id: db.nextId("enrollments"), user_id: req.user.id, course_id: courseId });
    }
    res.status(201).json({ enrolled: true });
});

app.get("/api/enrollments/me", authRequired, (req, res) => {
    const enrolled = db.enrollments.filter(e => e.user_id == req.user.id);
    const courses = enrolled.map(e => {
        const c = db.courses.find(c => c.id == e.course_id);
        return c ? { id: c.id, title: c.title, thumbnailUrl: c.thumbnail_url, instructorName: c.instructor_name, shortDescription: c.short_description } : null;
    }).filter(Boolean);
    res.json({ courses });
});

// Learning
app.get("/api/courses/:courseId/learn", authRequired, (req, res) => {
    const courseId = req.params.courseId;
    const c = db.courses.find(c => c.id == courseId);
    if (!c) return res.status(404).json({ message: "Not found" });
    const lessons = getLessonsForCourse(courseId);
    const prog = db.progress.filter(p => p.user_id == req.user.id && p.course_id == courseId);
    const completedLessonIds = prog.filter(p => p.completed).map(p => p.lesson_id);
    const lastWatched = [...prog].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    const percentage = lessons.length ? Math.round((completedLessonIds.length / lessons.length) * 100) : 0;
    res.json({ course: { id: c.id, title: c.title, durationMinutes: c.duration_minutes }, lessons, progress: { completedLessonIds, percentage, lastWatchedLessonId: lastWatched?.lesson_id || lessons[0]?.id || null } });
});

// Progress
app.put("/api/progress/lesson/:lessonId", authRequired, (req, res) => {
    const lessonId = Number(req.params.lessonId);
    const { courseId, completed = false } = req.body;
    const existing = db.progress.find(p => p.user_id == req.user.id && p.lesson_id == lessonId);
    if (existing) { existing.completed = completed; existing.updated_at = new Date(); }
    else { db.progress.push({ id: db.nextId("progress"), user_id: req.user.id, course_id: courseId, lesson_id: lessonId, completed, updated_at: new Date() }); }
    const allLessons = getLessonsForCourse(courseId);
    const done = db.progress.filter(p => p.user_id == req.user.id && p.course_id == courseId && p.completed).length;
    res.json({ ok: true, percentage: allLessons.length ? Math.round((done / allLessons.length) * 100) : 0 });
});

app.get("/api/progress/course/:courseId", authRequired, (req, res) => {
    const courseId = req.params.courseId;
    const prog = db.progress.filter(p => p.user_id == req.user.id && p.course_id == courseId);
    const completedLessonIds = prog.filter(p => p.completed).map(p => p.lesson_id);
    const allLessons = getLessonsForCourse(courseId);
    const lastWatched = [...prog].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    res.json({ completedLessonIds, percentage: allLessons.length ? Math.round((completedLessonIds.length / allLessons.length) * 100) : 0, lastWatchedLessonId: lastWatched?.lesson_id || null });
});

export default app;
