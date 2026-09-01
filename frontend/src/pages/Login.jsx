import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { API_URL } from '../config';
import './Login.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('user'); // 'user' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isLogin 
      ? `${API_URL}/${role}/signin`
      : `${API_URL}/${role}/signup`;

    const body = isLogin 
      ? { email, password }
      : { email, password, firstName, lastName };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error?.[0]?.message || 'Something went wrong');
      }

      if (isLogin) {
        toast.success("Welcome back!");
        login(data.token, role);
        navigate('/');
      } else {
        // If signup success, switch to login
        setIsLogin(true);
        toast.success('Signup successful! Please sign in.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex justify-center items-center auth-container">
      <div className="card auth-card">
        <div className="auth-header flex flex-col items-center">
          <BookOpen size={40} className="auth-icon" />
          <h2>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to access your courses' : 'Join us to start learning today'}
          </p>
        </div>

        <div className="role-selector flex justify-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={role === 'user'} onChange={() => setRole('user')} /> Student
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={role === 'admin'} onChange={() => setRole('admin')} /> Admin
          </label>
        </div>

        <form className="auth-form flex flex-col gap-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="flex gap-4">
              <div className="input-group">
                <label>First Name</label>
                <input type="text" className="input-field" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input type="text" className="input-field" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
          )}
          
          <div className="input-group">
            <label>Email address</label>
            <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="input-field" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ paddingRight: '2.5rem' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ 
                  position: 'absolute', 
                  right: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'transparent', 
                  color: 'var(--text-secondary)' 
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit flex items-center justify-center gap-2" disabled={loading}>
            {loading && <Loader2 size={18} className="spinner" />}
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button className="text-btn" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
