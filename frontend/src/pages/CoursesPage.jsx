import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCourses()
      .then((data) => setCourses(data.courses))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function enroll(courseId) {
    try {
      await api.enroll(courseId);
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, isEnrolled: true } : c))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="center-screen">Loading courses...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <section>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>Explore Courses</h1>
        <p style={{ color: 'var(--text-muted)' }}>Master new skills with our high-quality video tutorials.</p>
      </header>

      <div className="course-grid">
        {courses.map((course) => (
          <article key={course.id} className="course-card">
            <div className="thumb-wrap">
              <img src={course.thumbnailUrl} alt={course.title} className="thumb" />
            </div>
            <div className="card-body">
              <h3>{course.title}</h3>
              <p>{course.shortDescription}</p>

              <div className="card-meta">
                <span>👤 {course.instructorName}</span>
                <span>⏱️ {course.durationMinutes}m</span>
              </div>
            </div>
            <div className="card-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
              <Link className="btn btn-outline" style={{ flex: 1 }} to={`/courses/${course.id}`}>
                Details
              </Link>
              {course.isEnrolled ? (
                <Link className="btn btn-primary" style={{ flex: 1 }} to={`/learn/${course.id}`}>
                  Learn
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    console.log("Catalog Enroll Clicked for:", course.id);
                    enroll(course.id);
                  }}
                >
                  Enroll
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

