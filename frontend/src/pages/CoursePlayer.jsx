import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';
import './CoursePlayer.css';

// Helper function to extract YouTube ID
const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const STORAGE_KEY = (courseId) => `completed_lessons_${courseId}`;

export default function CoursePlayer() {
  const { courseId } = useParams();
  const { token, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedLessons, setCompletedLessons] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || role !== 'user') {
      navigate('/');
      return;
    }

    fetch(`${API_URL}/user/course/${courseId}/lessons`, {
      headers: { 'token': token }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load lessons');
        return data;
      })
      .then(data => {
        setLessons(data.lessons || []);
        setLoading(false);
        // Load completed lessons from localStorage
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY(courseId)) || '[]');
        setCompletedLessons(saved);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [courseId, isAuthenticated, role, navigate, token]);

  const activeLesson = lessons[activeIndex] || null;

  const markComplete = useCallback((lessonId) => {
    setCompletedLessons(prev => {
      if (prev.includes(lessonId)) return prev;
      const next = [...prev, lessonId];
      localStorage.setItem(STORAGE_KEY(courseId), JSON.stringify(next));
      return next;
    });
  }, [courseId]);

  const goToLesson = useCallback((index) => {
    if (index >= 0 && index < lessons.length) {
      setActiveIndex(index);
      // Mark previous lesson complete when moving forward
      if (index > 0) markComplete(lessons[index - 1]._id);
    }
  }, [lessons, markComplete]);

  const handleSelectLesson = (index) => {
    if (activeLesson) markComplete(activeLesson._id);
    setActiveIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goToLesson(activeIndex + 1);
      if (e.key === 'ArrowLeft') goToLesson(activeIndex - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, goToLesson]);

  if (loading) return (
    <div className="course-player-layout">
      <div className="player-sidebar">
        <div className="player-skeleton-sidebar">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="skeleton-lesson-item" />
          ))}
        </div>
      </div>
      <div className="player-main flex justify-center items-center">
        <div className="player-skeleton-video" />
      </div>
    </div>
  );

  if (error) return (
    <div className="container" style={{padding: '4rem', textAlign: 'center'}}>
      <h2 style={{color: 'var(--accent-color)'}}>Access Denied</h2>
      <p style={{margin: '1rem 0'}}>{error}</p>
      <button className="btn-secondary" onClick={() => navigate('/my-courses')}>Go Back to My Learning</button>
    </div>
  );

  const completedCount = completedLessons.filter(id => lessons.some(l => l._id === id)).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="course-player-layout">
      {/* Sidebar */}
      <div className="player-sidebar">
        <button className="back-btn flex items-center gap-2" onClick={() => navigate('/my-courses')}>
          <ArrowLeft size={18} /> Back to Courses
        </button>

        {/* Progress bar in sidebar */}
        <div className="sidebar-progress">
          <div className="sidebar-progress-bar">
            <div className="sidebar-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="sidebar-progress-text">{progressPercent}% complete</span>
        </div>

        <h2 className="sidebar-title">Course Content</h2>

        {lessons.length === 0 ? (
          <p className="no-lessons">No lessons published yet.</p>
        ) : (
          <ul className="lesson-list">
            {lessons.map((lesson, idx) => {
              const isCompleted = completedLessons.includes(lesson._id);
              const isActive = idx === activeIndex;
              return (
                <li
                  key={lesson._id}
                  className={`lesson-item flex items-center gap-3 ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => handleSelectLesson(idx)}
                >
                  {isCompleted
                    ? <CheckCircle size={18} className="lesson-icon check-icon" />
                    : <PlayCircle size={18} className="lesson-icon" />
                  }
                  <span className="lesson-name">{idx + 1}. {lesson.title}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Main Content */}
      <div className="player-main">
        {activeLesson ? (
          <div className="video-container">
            {/* Lesson progress indicator */}
            <div className="lesson-progress-indicator">
              <span>Lesson {activeIndex + 1} of {lessons.length}</span>
              <span className="completed-badge">{completedCount} completed</span>
            </div>

            <h1 className="video-title">{activeLesson.title}</h1>

            <div className="video-wrapper card">
              {getYouTubeId(activeLesson.videoUrl) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(activeLesson.videoUrl)}`}
                  frameBorder="0"
                  allowFullScreen
                  className="embedded-video"
                  title={activeLesson.title}
                />
              ) : (
                <video src={activeLesson.videoUrl} controls className="embedded-video" />
              )}
            </div>

            {/* Prev / Next navigation */}
            <div className="lesson-nav flex items-center justify-between">
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => goToLesson(activeIndex - 1)}
                disabled={activeIndex === 0}
              >
                <ChevronLeft size={18} /> Previous
              </button>

              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => {
                  markComplete(activeLesson._id);
                  if (activeIndex < lessons.length - 1) goToLesson(activeIndex + 1);
                }}
              >
                {activeIndex === lessons.length - 1 ? '✓ Mark Complete' : 'Next'} <ChevronRight size={18} />
              </button>
            </div>

            {activeLesson.description && (
              <div className="lesson-description card">
                <h3>About this lesson</h3>
                <p>{activeLesson.description}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="video-container flex justify-center items-center h-full">
            <p style={{color: 'var(--text-secondary)'}}>Select a lesson to start watching.</p>
          </div>
        )}
      </div>
    </div>
  );
}
