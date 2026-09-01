import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookX, BookOpen, PlayCircle } from 'lucide-react';
import CourseSkeleton from '../components/CourseSkeleton';
import { API_URL } from '../config';
import './MyCourses.css';

export default function MyCourses() {
  const { isAuthenticated, role, token } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track which courses have been opened before (simulate "continue" state)
  const openedCourses = JSON.parse(localStorage.getItem('openedCourses') || '[]');

  useEffect(() => {
    if (!isAuthenticated || role !== 'user') {
      navigate('/');
      return;
    }

    fetch(`${API_URL}/user/purchase`, {
      headers: { 'token': token }
    })
      .then(res => res.json())
      .then(data => {
        setCourses(data.coursesData || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch purchased courses:", err);
        setLoading(false);
      });
  }, [isAuthenticated, role, navigate, token]);

  const handleStartCourse = (courseId) => {
    const opened = JSON.parse(localStorage.getItem('openedCourses') || '[]');
    if (!opened.includes(courseId)) {
      opened.push(courseId);
      localStorage.setItem('openedCourses', JSON.stringify(opened));
    }
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="container" style={{ paddingTop: '3rem' }}>
      <div className="my-courses-header">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>My Learning Journey</h1>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Continue where you left off.</p>
          </div>
          {!loading && courses.length > 0 && (
            <div className="course-count-badge">
              <BookOpen size={18} />
              <span>{courses.length} {courses.length === 1 ? 'Course' : 'Courses'} Enrolled</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="course-grid">
          {[1, 2, 3].map(n => <CourseSkeleton key={n} />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state text-center" style={{ padding: '6rem 0' }}>
          <BookX size={80} style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem', opacity: 0.5 }} />
          <h3>You haven't enrolled in any courses yet</h3>
          <p className="text-muted mb-4">Discover your next passion in our library.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Browse Courses</button>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map(course => {
            const hasContinued = openedCourses.includes(course._id);
            return (
              <div
                key={course._id}
                className="card course-card clickable-card"
                onClick={() => handleStartCourse(course._id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleStartCourse(course._id)}
              >
                <div className="course-img-wrapper">
                  <img src={course.imageUrl} alt={course.title} className="course-img" />
                  <div className="play-overlay">
                    <PlayCircle size={48} color="white" />
                  </div>
                </div>
                <div className="course-content flex flex-col justify-between">
                  <div>
                    <h3 className="course-title">{course.title}</h3>
                    <p className="course-description">{course.description}</p>
                  </div>
                  <div className="course-footer">
                    <button
                      className={`btn-primary ${hasContinued ? 'btn-continue' : ''}`}
                      style={{ width: '100%' }}
                      onClick={e => { e.stopPropagation(); handleStartCourse(course._id); }}
                    >
                      {hasContinued ? '▶ Continue Learning' : '🚀 Start Learning'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
