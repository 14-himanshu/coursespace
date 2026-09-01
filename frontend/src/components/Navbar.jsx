import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, LogOut } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, logout, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container flex items-center justify-between">
        <div className="nav-brand">
          <Link to="/" className="nav-logo flex items-center gap-2">
            <img src="/logo.png" alt="CourseSpace Logo" style={{ height: '28px', width: '28px', objectFit: 'contain', filter: theme === 'light' ? 'invert(1)' : 'none' }} />
            <span>CourseSpace</span>
          </Link>
        </div>
        
        <div className="nav-links flex items-center gap-4">
          <Link to="/" className="nav-link">Courses</Link>
          
          {isAuthenticated ? (
            <>
              {role === 'admin' && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
              {role === 'user' && <Link to="/my-courses" className="nav-link">My Learning</Link>}
              <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-secondary">Sign In</Link>
          )}

          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
