import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const FLAGGED_PENDING_COUNT_KEY = 'flagged_pending_count';

const getFlaggedCount = () => {
  const savedCount = sessionStorage.getItem(FLAGGED_PENDING_COUNT_KEY);
  if (savedCount !== null) {
    return Number(savedCount);
  }

  const durableCases = JSON.parse(localStorage.getItem('flagged_cases') || '[]');
  const sessionCases = JSON.parse(sessionStorage.getItem('flagged_cases') || '[]');
  const allCases = [...durableCases, ...sessionCases].filter((item, index, all) =>
    item?.id && all.findIndex(match => match.id === item.id) === index
  );
  return allCases.filter(c => c.status === 'pending').length;
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [flaggedCount, setFlaggedCount] = useState(getFlaggedCount);

  useEffect(() => {
    const handleFlaggedCasesUpdated = (event) => {
      const pendingCount = event.detail?.pendingCount;
      setFlaggedCount(Number.isFinite(pendingCount) ? pendingCount : getFlaggedCount());
    };

    setFlaggedCount(getFlaggedCount());
    window.addEventListener('flaggedCasesUpdated', handleFlaggedCasesUpdated);

    return () => {
      window.removeEventListener('flaggedCasesUpdated', handleFlaggedCasesUpdated);
    };
  }, [location]);

  const links = [
    { path: '/submit', label: 'Credential Submission', icon: 'ti-file-upload' },
    { path: '/dashboard', label: 'Trust Score', icon: 'ti-shield-check' },
    { path: '/payment', label: 'Payment', icon: 'ti-credit-card' },
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
            {link.badge > 0 && (
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
