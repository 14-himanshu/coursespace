import './CourseSkeleton.css';

export default function CourseSkeleton() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton skeleton-img"></div>
      <div className="skeleton-content">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton skeleton-btn"></div>
      </div>
    </div>
  );
}
