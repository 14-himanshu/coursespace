import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Phone, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CourseSkeleton from '../components/CourseSkeleton';
import { API_URL } from '../config';
import './Home.css';

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  // Phone modal state
  const [phoneModal, setPhoneModal] = useState(null); // holds courseId when open
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const { isAuthenticated, token, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/course/preview`)
      .then(res => res.json())
      .then(data => {
        setCourses(data.courses || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch courses:", err);
        setLoading(false);
      });
  }, []);

  const handleEnroll = (courseId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (role === 'admin') {
      toast.error("Admins cannot purchase courses.");
      return;
    }
    // Open phone number modal first — user must type their own number
    setPhone('');
    setPhoneError('');
    setPhoneModal(courseId);
  };

  const handlePhoneSubmit = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const courseId = phoneModal;
    setPhoneModal(null);
    setPurchasing(courseId);

    try {
      // 1. Create Razorpay Order
      const res = await fetch(`${API_URL}/user/purchase/${courseId}/order`, {
        method: 'POST',
        headers: { 'token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate order');

      // 2. Load Razorpay Script (avoid duplicate loading)
      const existingScript = document.querySelector('script[src*="razorpay"]');
      if (existingScript && window.Razorpay) {
        openRazorpay(data, courseId, cleaned);
      } else {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        script.onload = () => openRazorpay(data, courseId, cleaned);
        script.onerror = () => {
          toast.error("Failed to load Razorpay SDK. Are you online?");
          setPurchasing(null);
        };
      }
    } catch (err) {
      toast.error(err.message);
      setPurchasing(null);
    }
  };

  const openRazorpay = (data, courseId, userPhone) => {
    // Clear any Razorpay-cached contact info from previous sessions
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('rzp_') || key.includes('razorpay')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Failed to clear razorpay cache", e);
    }

    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: "CourseSpace",
      description: "Course Enrollment",
      order_id: data.orderId,
      prefill: {
        contact: '+91' + userPhone
      },
      readonly: {
        contact: true
      },
      // Hide the "Using as +91 XXXXXX" cached contact block in Razorpay's UI
      config: {
        display: {
          hide: [{ method: 'contact' }],
          preferences: {
            show_default_blocks: true
          }
        }
      },
      handler: async function (response) {
        try {
          // 3. Verify Payment
          const verifyRes = await fetch(`${API_URL}/user/purchase/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': token
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              courseId
            })
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.message || 'Payment verification failed');
          toast.success('Payment Successful! Course Enrolled.');
          navigate('/my-courses');
        } catch (err) {
          toast.error(err.message);
        }
      },
      theme: { color: "#6366f1" }
    };
    const rzp1 = new window.Razorpay(options);
    rzp1.on('payment.failed', function (response) {
      toast.error("Payment failed: " + response.error.description);
    });
    rzp1.open();
    setPurchasing(null);
  };

  return (
    <div className="home-container">

      {/* Phone Number Modal — shown before Razorpay opens */}
      {phoneModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '2rem',
            position: 'relative'
          }}>
            <button
              onClick={() => setPhoneModal(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: 'var(--text-secondary)', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Phone size={24} color="white" />
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Enter Your Mobile Number</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Required for payment confirmation and receipt
              </p>
            </div>

            <div className="input-group" style={{ marginBottom: '0.5rem' }}>
              <label>Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500',
                  pointerEvents: 'none'
                }}>+91</span>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setPhoneError('');
                  }}
                  onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                  style={{ paddingLeft: '3rem' }}
                  autoFocus
                />
              </div>
              {phoneError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem' }}>{phoneError}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setPhoneModal(null); }}>
                Cancel
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handlePhoneSubmit}>
                Proceed to Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Hero Section */}
      <section className="hero-section">
        <div className="hero-content text-center">
          <h1 className="hero-title">Master your craft with world-class courses</h1>
          <p className="hero-subtitle">
            Join thousands of students learning from top instructors. Upgrade your skills and achieve your goals today.
          </p>
          <div className="hero-buttons">
            <a href="#courses" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Explore Courses</a>
          </div>
        </div>
      </section>

      <div id="courses" className="container" style={{ paddingTop: '4rem' }}>
        <div className="header-section text-center mb-4">
          <h2>Available Courses</h2>
          <p className="text-muted">Explore our library and start learning today.</p>
        </div>

        {loading ? (
          <div className="course-grid">
            {[1, 2, 3, 4, 5, 6].map(n => <CourseSkeleton key={n} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state text-center" style={{ padding: '4rem 0' }}>
            <BookOpen size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3>No courses available yet</h3>
            <p className="text-muted">Check back later for new amazing content!</p>
          </div>
        ) : (
          <div className="course-grid">
            {courses.map(course => (
              <div key={course._id} className="card course-card">
                <img src={course.imageUrl} alt={course.title} className="course-img" />
                <div className="course-content flex flex-col justify-between">
                  <div>
                    <h3 className="course-title">{course.title}</h3>
                    <p className="course-description">{course.description}</p>
                  </div>
                  <div className="course-footer flex items-center justify-between">
                    <span className="course-price">₹{course.price}</span>
                    <button
                      className="btn-primary flex items-center justify-center gap-2"
                      onClick={() => handleEnroll(course._id)}
                      disabled={purchasing === course._id}
                    >
                      {purchasing === course._id && <Loader2 size={16} className="spinner" />}
                      {purchasing === course._id ? 'Enrolling...' : 'Enroll Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
