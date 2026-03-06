import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCourse(courseId)
      .then((data) => setCourse(data.course))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function enroll() {
    console.log("Enroll button clicked, courseId:", courseId);
    try {
      setLoading(true);
      await api.enroll(Number(courseId));
      console.log("Enroll successful, navigating to learn page.");
      navigate(`/learn/${courseId}`);
    } catch (err) {
      console.error("Enroll failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="center-screen">Loading course details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!course) return <div className="error-message">Course not found</div>;

  return (
    <div className="details-container">
      <div className="details-hero">
        <div className="details-content">
          <h1>{course.title}</h1>
          <div className="instructor-badge">
            <div className="avatar">{course.instructorName[0]}</div>
            <div>
              <div style={{ fontWeight: '600' }}>{course.instructorName}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lead Instructor</div>
            </div>
          </div>

          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            {course.description}
          </p>

          <div className="details-stats">
            <div className="stat-item">
              <span className="stat-value">{course.totalLessons}</span>
              <span className="stat-label">Lessons</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{course.durationMinutes}m</span>
              <span className="stat-label">Duration</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">Beginner</span>
              <span className="stat-label">Level</span>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>What you'll learn</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {course.whatYouWillLearn.map((item) => (
                <li key={item} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--success)' }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="details-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                console.log("Details Page Enroll Clicked");
                enroll();
              }}
              style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
            >
              Enroll Now
            </button>
            <Link className="btn btn-outline" to="/courses">
              Back to Catalog
            </Link>
          </div>
        </div>

        <aside className="details-card">
          <img src={course.thumbnailUrl} alt={course.title} className="details-thumb-large" />
          <div style={{ padding: '1rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Course Curriculum</h4>
            {course.sections?.map(section => (
              <div key={section.id} style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  {section.title}
                </div>
                <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}>
                  {section.lessons?.map(lesson => (
                    <div key={lesson.id} style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      • {lesson.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

