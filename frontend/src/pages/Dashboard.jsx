import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Loader2, LayoutGrid, Search, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config';
import './Dashboard.css';

export default function Dashboard() {
  const { isAuthenticated, role, token } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Course Form State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lesson Form State
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonLoading, setLessonLoading] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null); // courseId to confirm deletion

  const fetchCourses = useCallback(() => {
    fetch(`${API_URL}/admin/course/all`, {
      headers: { 'token': token }
    })
      .then(res => res.json())
      .then(data => setCourses(data.courses || []))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/');
      return;
    }
    fetchCourses();
  }, [isAuthenticated, role, navigate, fetchCourses]);

  // Stats
  const totalCourses = courses.length;

  // Filtered courses by search
  const filteredCourses = useMemo(() =>
    courses.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [courses, searchQuery]);

  const openCreateModal = () => {
    setEditingCourseId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setImageFile(null);
    setIsCourseModalOpen(true);
  };

  const openEditModal = (course) => {
    setEditingCourseId(course._id);
    setTitle(course.title);
    setDescription(course.description);
    setPrice(course.price);
    setImageFile(null);
    setIsCourseModalOpen(true);
  };

  const closeCourseModal = () => {
    setIsCourseModalOpen(false);
    setEditingCourseId(null);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    if (!editingCourseId && !imageFile) {
      toast.error("Please select an image file.");
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const url = editingCourseId
        ? `${API_URL}/admin/course/${editingCourseId}`
        : `${API_URL}/admin/course`;

      const method = editingCourseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'token': token },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save course');

      toast.success(editingCourseId ? 'Course updated!' : 'Course created successfully!');
      fetchCourses();
      closeCourseModal();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_URL}/admin/course/${deleteTarget}`, {
        method: 'DELETE',
        headers: { 'token': token }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete course');

      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    setLessonLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/course/${selectedCourse._id}/lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token
        },
        body: JSON.stringify({ title: lessonTitle, videoUrl: lessonVideoUrl })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add lesson');

      toast.success('Lesson added successfully!');
      setSelectedCourse(null);
      setLessonTitle('');
      setLessonVideoUrl('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLessonLoading(false);
    }
  };

  return (
    <div className="container dashboard-container">

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <LayoutGrid size={22} />
          </div>
          <div>
            <div className="stat-value">{totalCourses}</div>
            <div className="stat-label">Total Courses</div>
          </div>
        </div>
      </div>

      {/* Header Row */}
      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>Admin Dashboard</h2>
        <button className="btn-primary flex items-center gap-2" onClick={openCreateModal}>
          <Plus size={18} /> Create New Course
        </button>
      </div>

      {/* Search Bar */}
      {courses.length > 0 && (
        <div className="search-bar-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="input-field search-input"
            placeholder="Search courses by name or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Courses Grid */}
      <div className="course-grid">
        {filteredCourses.map(course => (
          <div key={course._id} className="card course-card">
            <img src={course.imageUrl} alt={course.title} className="course-img" style={{ height: '200px', objectFit: 'cover' }} />
            <div className="course-content flex flex-col justify-between h-full">
              <div>
                <h3 className="course-title">{course.title}</h3>
                <span className="course-price">₹{course.price}</span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button
                  className="btn-secondary flex-1 mr-2"
                  onClick={() => setSelectedCourse(course)}
                >
                  Add Lesson
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(course)}
                    className="icon-btn"
                    title="Edit Course"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(course._id)}
                    className="icon-btn icon-btn-danger"
                    title="Delete Course"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && (
          <div className="text-center" style={{ gridColumn: '1 / -1', padding: '4rem', color: 'var(--text-secondary)' }}>
            {searchQuery
              ? <p>No courses found matching "<strong>{searchQuery}</strong>"</p>
              : <p>You haven't created any courses yet.</p>
            }
          </div>
        )}
      </div>

      {/* Create/Edit Course Modal */}
      {isCourseModalOpen && (
        <div className="modal-overlay">
          <div className="card modal-content">
            <div className="flex justify-between items-center mb-4">
              <h3>{editingCourseId ? 'Edit Course' : 'Create New Course'}</h3>
              <button onClick={closeCourseModal} className="icon-btn"><X size={20} /></button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSubmitCourse}>
              <div className="input-group">
                <label>Course Title</label>
                <input type="text" className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea className="input-field" rows="3" value={description} onChange={e => setDescription(e.target.value)} required></textarea>
              </div>
              <div className="input-group">
                <label>Price (₹)</label>
                <input type="number" step="0.01" className="input-field" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Course Thumbnail (Image)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="input-field"
                  onChange={e => setImageFile(e.target.files[0])}
                  required={!editingCourseId}
                  style={{ padding: '0.5rem' }}
                />
                {editingCourseId && <small style={{ color: 'var(--text-tertiary)' }}>Leave blank to keep existing image</small>}
              </div>
              <div className="flex gap-4 mt-2">
                <button type="button" className="btn-secondary flex-1" onClick={closeCourseModal}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex justify-center items-center gap-2" disabled={loading}>
                  {loading && <Loader2 size={18} className="spinner" />}
                  {loading ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {selectedCourse && (
        <div className="modal-overlay">
          <div className="card modal-content">
            <div className="flex justify-between items-center mb-4">
              <h3>Add Lesson to "{selectedCourse.title}"</h3>
              <button onClick={() => setSelectedCourse(null)} className="icon-btn"><X size={20} /></button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleAddLesson}>
              <div className="input-group">
                <label>Lesson Title</label>
                <input type="text" className="input-field" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Video URL (YouTube/Vimeo/MP4)</label>
                <input type="url" className="input-field" placeholder="https://youtube.com/..." value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} required />
              </div>
              <div className="flex gap-4 mt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setSelectedCourse(null)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex justify-center items-center gap-2" disabled={lessonLoading}>
                  {lessonLoading && <Loader2 size={18} className="spinner" />}
                  {lessonLoading ? 'Saving...' : 'Save Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="card modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="delete-warning-icon">
              <AlertTriangle size={40} color="#ef4444" />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Course?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              This action is <strong>permanent</strong> and cannot be undone. All lessons in this course will also be removed.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={handleDeleteCourse}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
