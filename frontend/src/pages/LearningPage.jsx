import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export default function LearningPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api.getLearningData(courseId);
        setCourse(data.course);
        setLessons(data.lessons);
        setCompletedLessonIds(data.progress.completedLessonIds);
        setPercentage(data.progress.percentage);
        setActiveLessonId(data.progress.lastWatchedLessonId || data.lessons[0]?.id || null);
      } catch (err) {
        if (err.message.includes("Enroll")) {
          navigate(`/courses/${courseId}`);
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, navigate]);

  const activeIndex = useMemo(
    () => lessons.findIndex((l) => l.id == activeLessonId),
    [lessons, activeLessonId]
  );
  const activeLesson = activeIndex >= 0 ? lessons[activeIndex] : null;

  // YouTube API Integration for auto-completion
  useEffect(() => {
    if (!activeLesson) return;

    // Load YT API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    let player;
    const onPlayerStateChange = (event) => {
      if (event.data === window.YT.PlayerState.ENDED) {
        console.log("Video finished, marking complete...");
        markComplete();
      }
    };

    const initPlayer = () => {
      player = new window.YT.Player("yt-player", {
        events: {
          onStateChange: onPlayerStateChange,
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (player && player.destroy) player.destroy();
    };
  }, [activeLessonId]); // Re-init on lesson change

  async function selectLesson(lessonId) {
    setActiveLessonId(lessonId);
    try {
      await api.markLessonProgress({
        lessonId: Number(lessonId),
        courseId: Number(courseId),
        completed: completedLessonIds.includes(Number(lessonId))
      });
    } catch { }
  }

  async function markComplete() {
    if (!activeLesson) return;
    try {
      const res = await api.markLessonProgress({
        lessonId: Number(activeLesson.id),
        courseId: Number(courseId),
        completed: true
      });
      setCompletedLessonIds((prev) =>
        prev.includes(activeLesson.id) ? prev : [...prev, activeLesson.id]
      );
      setPercentage(res.percentage);
    } catch (err) {
      setError(err.message);
    }
  }

  async function goNext() {
    if (activeIndex < 0 || activeIndex >= lessons.length - 1) return;
    await selectLesson(lessons[activeIndex + 1].id);
  }

  async function goPrev() {
    if (activeIndex <= 0) return;
    await selectLesson(lessons[activeIndex - 1].id);
  }

  if (loading) return <div className="center-screen">Loading learning experience...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!activeLesson && lessons.length > 0) {
    // Fallback if findIndex failed but we have data
    setActiveLessonId(lessons[0].id);
    return <div className="center-screen">Adjusting lesson...</div>;
  }
  if (!activeLesson) return <div className="error-message">No lessons found.</div>;

  return (
    <div className="learning-layout">
      <main className="learning-main">
        <div className="video-section">
          <iframe
            id="yt-player"
            src={`https://www.youtube.com/embed/${activeLesson.youtubeVideoId}?autoplay=1&enablejsapi=1&rel=0`}
            title={activeLesson.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="lesson-header">
          <div className="lesson-info">
            <h1>{activeLesson.title}</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {activeLesson.sectionTitle} • {activeLesson.durationMinutes} minutes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={goPrev} disabled={activeIndex <= 0}>
              ← Previous
            </button>
            <button
              className={`btn ${completedLessonIds.includes(activeLesson.id) ? 'btn-success' : 'btn-primary'}`}
              onClick={markComplete}
            >
              {completedLessonIds.includes(activeLesson.id) ? 'Completed ✓' : 'Mark as Complete'}
            </button>
            <button className="btn btn-outline" onClick={goNext} disabled={activeIndex >= lessons.length - 1}>
              Next →
            </button>
          </div>
        </div>

        <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem' }}>About this lesson</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            In this lesson of <strong>{course?.title}</strong>, we dive deep into {activeLesson.title.toLowerCase()}.
            Make sure to follow along and practice the concepts shown in the video.
          </p>
        </div>
      </main>

      <aside className="sidebar-card">
        <div className="sidebar-header">
          <h3 style={{ marginBottom: '1rem' }}>Course Content</h3>
          <div className="progress-container">
            <div className="progress-info">
              <span>Overall Progress</span>
              <span>{percentage}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        </div>

        <div className="lesson-list">
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              className={`lesson-item ${lesson.id === activeLessonId ? "active" : ""} ${completedLessonIds.includes(lesson.id) ? "completed" : ""}`}
              onClick={() => selectLesson(lesson.id)}
            >
              <div className="check-circle">
                {completedLessonIds.includes(lesson.id) ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{lesson.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lesson.durationMinutes}m</div>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

