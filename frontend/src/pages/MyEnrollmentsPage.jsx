import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function MyEnrollmentsPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api
            .getMyEnrollments()
            .then((data) => setCourses(data.courses))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="center-screen">Loading your courses...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <section>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>My Learning</h1>
                <p style={{ color: 'var(--text-muted)' }}>Continue where you left off in your enrolled courses.</p>
            </header>

            {courses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <h2 style={{ marginBottom: '1rem' }}>You haven't enrolled in any courses yet.</h2>
                    <Link to="/courses" className="btn btn-primary">Browse Catalog</Link>
                </div>
            ) : (
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
                                </div>
                            </div>
                            <div className="card-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
                                <Link className="btn btn-primary" style={{ width: '100%' }} to={`/learn/${course.id}`}>
                                    Continue Learning
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
