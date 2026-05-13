import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [flaggedCount, setFlaggedCount] = useState(3);

  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem('flagged_cases') || '[]');
    const pending = saved.filter(c => c.status === 'pending').length;
    setFlaggedCount(pending + 3);
  }, [location]);

  const links = [
    { path: '/submit', label: 'Credential Submission', icon: 'ti-file-upload' },
    { path: '/dashboard', label: 'Trust Score', icon: 'ti-shield-check' },
    { path: '/admin', label: 'Admin Review', icon: 'ti-flag', badge: flaggedCount },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate('/submit')}>
        <div className="navbar-logo-icon">MV</div>
        <span className="navbar-logo-name">MedVerify</span>
      </div>

      <div className="navbar-links">
        {links.map((link) => (
          <button
            key={link.path}
            className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
            onClick={() => navigate(link.path)}
          >
            <i className={`ti ${link.icon}`} />
            {link.label}
            {link.badge && (
              <span className="navbar-badge">{link.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        {user?.name && (
          <div className="navbar-user">
            <div className="navbar-user-name">{user.name}</div>
            <div className="navbar-user-type">{user.accountType}</div>
          </div>
        )}
        <div className="navbar-avatar">
          {user?.initials || 'MV'}
        </div>
        <button className="navbar-signout" onClick={handleLogout}>
          <i className="ti ti-logout" />
        </button>
      </div>
    </nav>
  );
}