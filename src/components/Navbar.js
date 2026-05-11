import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: '/submit', label: 'Credential Submission', icon: 'ti-file-upload' },
    { path: '/dashboard', label: 'Trust Score', icon: 'ti-shield-check' },
    { path: '/admin', label: 'Admin Review', icon: 'ti-flag', badge: 3 },
  ];

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
            {link.badge && <span className="navbar-badge">{link.badge}</span>}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        <div className="navbar-avatar">AD</div>
        <button className="navbar-signout" onClick={() => navigate('/')}>
          <i className="ti ti-logout" />
        </button>
      </div>
    </nav>
  );
}