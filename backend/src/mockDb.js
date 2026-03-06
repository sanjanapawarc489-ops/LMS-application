// Mock database to replace mysql2/promise for environments where Aiven is unreachable
class MockDatabase {
    constructor() {
        this.tables = {
            users: [],
            courses: [],
            sections: [],
            lessons: [],
            enrollments: [],
            progress: []
        };
        this.lastIds = {
            users: 0,
            courses: 0,
            sections: 0,
            lessons: 0,
            enrollments: 0,
            progress: 0
        };
        console.log("MockDatabase: In-memory store initialized.");
    }

    async query(sql, args = []) {
        return this.execute(sql, args);
    }

    async execute(sql, args = []) {
        const lower = sql.toLowerCase().replace(/\s+/g, " ").trim();

        // --- INSERT LOGIC ---
        if (lower.includes("insert into users")) {
            const id = ++this.lastIds.users;
            this.tables.users.push({ id, name: args[0], email: args[1], password_hash: args[2], role: args[3], created_at: new Date() });
            console.log(`Mock DB: Inserted user ${id}`);
            return [{ insertId: id }, null];
        }
        if (lower.includes("insert into courses")) {
            const id = ++this.lastIds.courses;
            this.tables.courses.push({
                id,
                title: args[0],
                thumbnail_url: args[1],
                instructor_name: args[2],
                short_description: args[3],
                description: args[4],
                what_you_will_learn: args[5],
                duration_minutes: args[6],
                created_at: new Date()
            });
            console.log(`Mock DB: Inserted course ${id}`);
            return [{ insertId: id }, null];
        }
        if (lower.includes("insert into sections")) {
            const id = ++this.lastIds.sections;
            this.tables.sections.push({ id, course_id: args[0], title: args[1], position: args[2] });
            return [{ insertId: id }, null];
        }
        if (lower.includes("insert into lessons")) {
            const id = ++this.lastIds.lessons;
            this.tables.lessons.push({ id, section_id: args[0], title: args[1], youtube_video_id: args[2], duration_minutes: args[3], position: args[4] });
            return [{ insertId: id }, null];
        }
        if (lower.includes("insert into enrollments")) {
            const id = ++this.lastIds.enrollments;
            this.tables.enrollments.push({ id, user_id: args[0], course_id: args[1], enrolled_at: new Date() });
            return [{ insertId: id }, null];
        }

        // Upsert progress
        if (lower.includes("insert into progress")) {
            const userId = args[0];
            const courseId = args[1];
            const lessonId = args[2];
            const completed = args[3];
            let item = this.tables.progress.find(p => p.user_id == userId && p.lesson_id == lessonId);
            if (item) {
                item.completed = completed;
                item.updated_at = new Date();
            } else {
                this.tables.progress.push({
                    id: ++this.lastIds.progress,
                    user_id: userId,
                    course_id: courseId,
                    lesson_id: lessonId,
                    completed: completed,
                    updated_at: new Date(),
                    last_watched_at: new Date()
                });
            }
            return [{ affectedRows: 1 }, null];
        }

        // --- SELECT COUNT LOGIC ---
        if (lower.includes("select count(*) as c from users")) {
            return [[{ c: this.tables.users.length }], null];
        }
        if (lower.includes("select count(*) as c from courses")) {
            return [[{ c: this.tables.courses.length }], null];
        }
        if (lower.includes("select count(*) as total from lessons")) {
            const courseId = args[0];
            const count = this.tables.lessons.filter(l => {
                const s = this.tables.sections.find(sec => sec.id == l.section_id);
                return s && s.course_id == courseId;
            }).length;
            return [[{ total: count }], null];
        }
        if (lower.includes("select count(*) as done from progress")) {
            const userId = args[0];
            const courseId = args[1];
            const count = this.tables.progress.filter(p => p.user_id == userId && p.course_id == courseId && p.completed == 1).length;
            return [[{ done: count }], null];
        }

        // --- SELECT LOGIC ---
        // Login / User Fetch
        if (lower.includes("from users where email = ?")) {
            const user = this.tables.users.find(u => u.email === args[0]);
            return [user ? [user] : [], null];
        }
        if (lower.includes("from users where id = ?")) {
            const user = this.tables.users.find(u => u.id == args[0]);
            return [user ? [user] : [], null];
        }

        // Courses List (Handle subqueries and joins by checking keywords)
        if (lower.includes("from courses") && !lower.includes("where c.id = ?") && !lower.includes("where id = ?") && (lower.includes("order by") || !lower.includes("where"))) {
            const result = this.tables.courses.map(c => {
                const lessonsCount = this.tables.lessons.filter(l => {
                    const s = this.tables.sections.find(sec => sec.id == l.section_id);
                    return s && s.course_id == c.id;
                }).length;
                return {
                    ...c,
                    thumbnailUrl: c.thumbnail_url,
                    instructorName: c.instructor_name,
                    shortDescription: c.short_description,
                    durationMinutes: c.duration_minutes,
                    totalLessons: lessonsCount
                };
            });
            return [result, null];
        }

        // Single Course Detail
        if (lower.includes("from courses where id = ?") || lower.includes("from courses where c.id = ?")) {
            const c = this.tables.courses.find(c => c.id == args[0]);
            if (!c) return [[], null];
            return [[{
                ...c,
                thumbnailUrl: c.thumbnail_url,
                instructorName: c.instructor_name,
                shortDescription: c.short_description,
                whatYouWillLearn: c.what_you_will_learn,
                durationMinutes: c.duration_minutes
            }], null];
        }

        // Sections
        if (lower.includes("from sections where course_id = ?")) {
            const secs = this.tables.sections.filter(s => s.course_id == args[0]).sort((a, b) => a.position - b.position);
            return [secs, null];
        }

        // Lessons
        if (lower.includes("from lessons l") && lower.includes("join sections s") && lower.includes("where s.course_id = ?")) {
            const courseId = args[0];
            const result = this.tables.lessons.filter(l => {
                const s = this.tables.sections.find(sec => sec.id == l.section_id);
                return s && s.course_id == courseId;
            }).map(l => {
                const s = this.tables.sections.find(sec => sec.id == l.section_id);
                return {
                    ...l,
                    youtubeVideoId: l.youtube_video_id,
                    durationMinutes: l.duration_minutes,
                    sectionId: l.section_id,
                    sectionTitle: s ? s.title : "",
                    sectionPosition: s ? s.position : 0
                };
            });
            return [result, null];
        }

        // Enrollments
        if (lower.includes("from enrollments") && lower.includes("where user_id = ? and course_id = ?")) {
            const e = this.tables.enrollments.find(en => en.user_id == args[0] && en.course_id == args[1]);
            return [e ? [e] : [], null];
        }
        if (lower.includes("from enrollments e join courses c") && lower.includes("where e.user_id = ?")) {
            const enrolls = this.tables.enrollments.filter(e => e.user_id == args[0]);
            const enrolledCourses = enrolls.map(e => {
                const c = this.tables.courses.find(course => course.id == e.course_id);
                return {
                    ...c,
                    thumbnailUrl: c.thumbnail_url,
                    instructorName: c.instructor_name,
                    shortDescription: c.short_description
                };
            }).filter(Boolean);
            return [enrolledCourses, null];
        }
        if (lower.includes("from enrollments") && lower.includes("where user_id = ?") && !lower.includes("join")) {
            const enrolled = this.tables.enrollments.filter(e => e.user_id == args[0]);
            return [enrolled, null];
        }

        // Progress
        if (lower.includes("from progress") && lower.includes("where user_id = ? and course_id = ?")) {
            const prog = this.tables.progress.filter(p => p.user_id == args[0] && p.course_id == args[1]).map(p => ({
                ...p,
                lessonId: p.lesson_id,
                lastWatchedAt: p.last_watched_at
            }));
            return [prog, null];
        }

        return [[], null];
    }
}

export default MockDatabase;
