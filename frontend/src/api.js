// In development: Vite proxy forwards /api -> http://localhost:4000
// In production (Vercel): /api/* is routed to the serverless function
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getToken() {
  return localStorage.getItem("lms_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const api = {
  register: (payload) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  getCourses: () => request("/courses"),
  getCourse: (courseId) => request(`/courses/${courseId}`),
  enroll: (courseId) =>
    request("/enrollments", {
      method: "POST",
      body: JSON.stringify({ courseId })
    }),
  getMyEnrollments: () => request("/enrollments/me"),
  getLearningData: (courseId) => request(`/courses/${courseId}/learn`),
  markLessonProgress: ({ lessonId, courseId, completed }) =>
    request(`/progress/lesson/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify({ courseId, completed })
    }),
  getCourseProgress: (courseId) => request(`/progress/course/${courseId}`)
};

