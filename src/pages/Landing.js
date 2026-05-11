import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    firstName: '', lastName: '', email: '', accountType: '', password: ''
  });

  const navigate = useNavigate();

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSignupChange = (e) => {
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    if (!loginForm.email || !loginForm.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/submit');
    }, 1200);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setError('');
    const { firstName, lastName, email, accountType, password } = signupForm;
    if (!firstName || !lastName || !email || !accountType || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/submit');
    }, 1200);
  };

  return (
    <div className="auth-page">
      <div className="auth-wrap">

        {/* LEFT PANEL — unchanged */}
        <div className="auth-left">
          <svg className="med-illustration" viewBox="0 0 340 580" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <rect width="340" height="580" fill="#06305A"/>
            <line x1="0" y1="0" x2="340" y2="580" stroke="#0C447C" strokeWidth="0.4" opacity="0.3"/>
            <line x1="340" y1="0" x2="0" y2="580" stroke="#0C447C" strokeWidth="0.4" opacity="0.3"/>
            <line x1="170" y1="0" x2="170" y2="580" stroke="#0C447C" strokeWidth="0.3" opacity="0.2"/>
            <line x1="0" y1="290" x2="340" y2="290" stroke="#0C447C" strokeWidth="0.3" opacity="0.2"/>
            <rect x="130" y="90" width="80" height="220" rx="12" fill="#0C447C" opacity="0.35"/>
            <rect x="80" y="150" width="180" height="80" rx="12" fill="#0C447C" opacity="0.35"/>
            <rect x="130" y="90" width="80" height="220" rx="12" fill="none" stroke="#378ADD" strokeWidth="0.8" opacity="0.5"/>
            <rect x="80" y="150" width="180" height="80" rx="12" fill="none" stroke="#378ADD" strokeWidth="0.8" opacity="0.5"/>
            <polyline
              className="heartbeat-line"
              points="0,310 40,310 55,310 65,270 75,355 90,250 100,370 110,310 150,310 160,310 175,295 185,325 200,310 340,310"
              fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
            <path d="M170 360 L215 380 L215 430 Q215 460 170 475 Q125 460 125 430 L125 380 Z" fill="none" stroke="#378ADD" strokeWidth="1" opacity="0.4"/>
            <path d="M170 365 L210 383 L210 430 Q210 457 170 470 Q130 457 130 430 L130 383 Z" fill="#0C447C" opacity="0.2"/>
            <polyline points="152,422 165,435 190,408" fill="none" stroke="#5DCAA5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
            <circle cx="80" cy="60" r="4" fill="#378ADD" opacity="0.5"/>
            <circle cx="100" cy="48" r="3" fill="#378ADD" opacity="0.4"/>
            <circle cx="120" cy="38" r="2" fill="#378ADD" opacity="0.3"/>
            <circle cx="260" cy="70" r="4" fill="#5DCAA5" opacity="0.4"/>
            <circle cx="280" cy="55" r="3" fill="#5DCAA5" opacity="0.3"/>
            <circle cx="300" cy="45" r="2" fill="#5DCAA5" opacity="0.25"/>
            <circle cx="40" cy="200" r="18" fill="none" stroke="#378ADD" strokeWidth="0.6" opacity="0.3"/>
            <circle cx="40" cy="200" r="10" fill="none" stroke="#378ADD" strokeWidth="0.6" opacity="0.2"/>
            <circle cx="300" cy="250" r="22" fill="none" stroke="#5DCAA5" strokeWidth="0.6" opacity="0.25"/>
            <circle cx="300" cy="250" r="12" fill="none" stroke="#5DCAA5" strokeWidth="0.6" opacity="0.2"/>
            <rect x="274" y="490" width="36" height="28" rx="6" fill="none" stroke="#378ADD" strokeWidth="0.8" opacity="0.4"/>
            <path d="M283 490 L283 484 Q283 476 292 476 Q301 476 301 484 L301 490" fill="none" stroke="#378ADD" strokeWidth="0.8" opacity="0.4"/>
            <circle cx="292" cy="505" r="3" fill="#378ADD" opacity="0.4"/>
            <path d="M30 520 Q50 505 70 520" fill="none" stroke="#378ADD" strokeWidth="0.8" opacity="0.35"/>
            <path d="M25 530 Q50 510 75 530" fill="none" stroke="#378ADD" strokeWidth="0.6" opacity="0.25"/>
            <path d="M20 540 Q50 517 80 540" fill="none" stroke="#378ADD" strokeWidth="0.5" opacity="0.18"/>
            <circle cx="295" cy="130" r="18" fill="none" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.3"/>
            <path d="M295 112 L295 95 Q295 82 308 82 Q321 82 321 95 L321 110" fill="none" stroke="#5DCAA5" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
            <circle cx="321" cy="113" r="5" fill="none" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.3"/>
          </svg>

          <div className="auth-overlay" />

          <div className="auth-left-text">
            <div className="auth-logo-badge">
              <div className="auth-logo-icon">MV</div>
              <span className="auth-logo-name">MedVerify</span>
            </div>
            <h1 className="auth-hero-title">Credential trust,<br />before every payment.</h1>
            <p className="auth-hero-sub">
              AI-powered verification that protects telemedicine platforms from fraudulent practitioners — in real time.
            </p>
            <div className="auth-stats">
              <div>
                <div className="auth-stat-val">95.3%</div>
                <div className="auth-stat-label">Accuracy</div>
              </div>
              <div>
                <div className="auth-stat-val">&lt;3s</div>
                <div className="auth-stat-label">Avg. scan</div>
              </div>
              <div>
                <div className="auth-stat-val">1,247</div>
                <div className="auth-stat-label">Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="auth-right">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => { setTab('signup'); setError(''); }}
            >
              Create account
            </button>
          </div>

          {error && (
            <div className="auth-error">
              <i className="ti ti-alert-circle" />
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form className="form-section" onSubmit={handleLogin}>
              <h2 className="auth-form-title">Welcome back</h2>
              <p className="auth-form-sub">Sign in to access your verification dashboard</p>

              <div className="form-field">
                <label>Email address</label>
                <div className="input-icon-wrap">
                  <i className="ti ti-mail iico" />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@hospital.ng"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Password</label>
                <div className="input-icon-wrap">
                  <i className="ti ti-lock iico" />
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                  />
                </div>
              </div>

              <span className="forgot">Forgot password?</span>

              <button className="btn-auth" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="ti ti-shield-check" />
                    Sign in securely
                  </>
                )}
              </button>

              <div className="auth-divider">or continue with</div>

              <button type="button" className="btn-squad" onClick={() => navigate('/submit')}>
                <div className="squad-dot">S</div>
                Continue with Squad
              </button>

              <p className="auth-footer">
                Don't have an account?{' '}
                <span onClick={() => { setTab('signup'); setError(''); }}>Create one</span>
              </p>
            </form>
          ) : (
            <form className="form-section" onSubmit={handleSignup}>
              <h2 className="auth-form-title">Join MedVerify</h2>
              <p className="auth-form-sub">Set up your platform or practitioner account</p>

              <div className="field-row">
                <div className="form-field">
                  <label>First name</label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Amara"
                    value={signupForm.firstName}
                    onChange={handleSignupChange}
                  />
                </div>
                <div className="form-field">
                  <label>Last name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Osei"
                    value={signupForm.lastName}
                    onChange={handleSignupChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Work email</label>
                <div className="input-icon-wrap">
                  <i className="ti ti-mail iico" />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@platform.ng"
                    value={signupForm.email}
                    onChange={handleSignupChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Account type</label>
                <select
                  name="accountType"
                  value={signupForm.accountType}
                  onChange={handleSignupChange}
                >
                  <option value="">Select account type</option>
                  <option>Telemedicine Platform</option>
                  <option>Health Insurance Company</option>
                  <option>Medical Practitioner</option>
                  <option>Hospital / Clinic</option>
                </select>
              </div>

              <div className="form-field">
                <label>Password</label>
                <div className="input-icon-wrap">
                  <i className="ti ti-lock iico" />
                  <input
                    type="password"
                    name="password"
                    placeholder="Min. 8 characters"
                    value={signupForm.password}
                    onChange={handleSignupChange}
                  />
                </div>
              </div>

              <button className="btn-auth" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <i className="ti ti-user-plus" />
                    Create account
                  </>
                )}
              </button>

              <p className="auth-footer">
                Already have an account?{' '}
                <span onClick={() => { setTab('login'); setError(''); }}>Sign in</span>
              </p>
            </form>
          )}

          <div className="trust-badge">
            <i className="ti ti-lock" />
            End-to-end encrypted · NDPR compliant · Squad secured
          </div>
        </div>

      </div>
    </div>
  );
}