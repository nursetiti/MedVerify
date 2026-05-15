import { useState, useEffect } from 'react';
import './Admin.css';

const FLAGGED_PENDING_COUNT_KEY = 'flagged_pending_count';
const AUTO_VERIFIED_COUNT_KEY = 'auto_verified_count';

const publishFlaggedPendingCount = (nextCases) => {
  const pendingCount = nextCases.filter(c => c.status === 'pending').length;
  sessionStorage.setItem(FLAGGED_PENDING_COUNT_KEY, String(pendingCount));
  window.dispatchEvent(new CustomEvent('flaggedCasesUpdated', {
    detail: { pendingCount },
  }));
};

export default function Admin() {
  const [cases, setCases] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [autoVerifiedCount, setAutoVerifiedCount] = useState(0);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const durableCases = JSON.parse(localStorage.getItem('flagged_cases') || '[]');
    const sessionCases = JSON.parse(sessionStorage.getItem('flagged_cases') || '[]');
    const allCases = [...durableCases, ...sessionCases].filter((item, index, all) =>
      item?.id && all.findIndex(match => match.id === item.id) === index
    );

    setCases(allCases);
    setAutoVerifiedCount(Number(localStorage.getItem(AUTO_VERIFIED_COUNT_KEY) || '0'));
    publishFlaggedPendingCount(allCases);

    fetch('https://medverify-api.onrender.com/fraud-alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFraudAlerts(data);
        else if (data && Array.isArray(data.alerts)) setFraudAlerts(data.alerts);
        else if (data && data.data && Array.isArray(data.data)) setFraudAlerts(data.data);
      })
      .catch(err => console.error("Failed to fetch fraud alerts:", err));
  }, []);

  // const stats = {
  //   total: 1247,
  //   cleared: 1189,
  //   blocked: 55,
  //   pending: cases.filter(c => c.status === 'pending').length,
  // };

  const stats = {
    cleared: autoVerifiedCount + cases.filter(c => c.status === 'cleared').length,
    blocked: cases.filter(c => c.status === 'blocked').length,
    pending: cases.filter(c => c.status === 'pending').length,
  };

  stats.total = stats.cleared + stats.blocked + stats.pending;

  const getScoreColor = (score) => {
    if (score >= 70) return '#1D9E75';
    if (score >= 50) return '#BA7517';
    return '#C94040';
  };

  const handleAction = (action, caseId) => {
    const updated = cases.map(c =>
      c.id === caseId ? { ...c, status: action, reviewedAt: new Date().toISOString() } : c
    );
    setCases(updated);

    localStorage.setItem('flagged_cases', JSON.stringify(updated));
    sessionStorage.setItem('flagged_cases', JSON.stringify(updated));
    publishFlaggedPendingCount(updated);
    setSelectedCase(null);
  };

  const filteredCases = cases.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div className="admin">

      {/* HEADER */}
      <div className="admin-header">
        <div>
          <div className="admin-title">Admin Review Panel</div>
          <div className="admin-sub">
            Flagged cases requiring manual review before payment decision
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Verified</div>
          <div className="stat-val" style={{ color: '#06305A' }}>{stats.total.toLocaleString()}</div>
          <div className="stat-sub">Real-time total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cleared</div>
          <div className="stat-val" style={{ color: '#1D9E75' }}>{stats.cleared.toLocaleString()}</div>
          <div className="stat-sub">
            {stats.total > 0 ? ((stats.cleared / stats.total) * 100).toFixed(1) + '%' : '0%'} rate
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Blocked</div>
          <div className="stat-val" style={{ color: '#C94040' }}>{stats.blocked.toLocaleString()}</div>
          <div className="stat-sub">
            {stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) + '%' : '0%'} rate
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-val" style={{ color: '#BA7517' }}>
            {stats.pending}
          </div>
          <div className="stat-sub">Needs action</div>
        </div>
      </div>

      {/* CASES TABLE */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">Flagged Cases</div>
          <div className="filter-tabs">
            {['all', 'pending', 'cleared', 'blocked'].map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <table className="cases-table">
          <thead>
            <tr>
              <th>Practitioner</th>
              <th>Reg. Number</th>
              <th>Trust Score</th>
              <th>Top Flag</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((c) => (
              <tr key={c.id} onClick={() => setSelectedCase(c)}>
                <td>
                  <div className="case-name">{c.name}</div>
                  <div className="case-spec">{c.specialty}</div>
                </td>
                <td><span className="mono">{c.reg}</span></td>
                <td>
                  <span
                    className="score-pill"
                    style={{
                      color: getScoreColor(c.score),
                      background: `${getScoreColor(c.score)}18`
                    }}
                  >
                    {c.score} / 100
                  </span>
                </td>
                <td><span className="top-flag">{c.topFlag}</span></td>
                <td><span className="case-time">{c.submitted}</span></td>
                <td>
                  <span className={`status-badge status-${c.status}`}>
                    {c.status === 'pending' ? '⏳ Pending'
                      : c.status === 'cleared' ? '✅ Cleared'
                        : '🚫 Blocked'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-review"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCase(c);
                    }}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {filteredCases.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: 'center', padding: '32px', color: '#888780' }}
                >
                  No cases found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FRAUD ALERTS TABLE */}
      <div className="admin-card" style={{ marginTop: '24px' }}>
        <div className="admin-card-header">
          <div className="admin-card-title">System Fraud Alerts</div>
          <div className="admin-sub" style={{ marginLeft: '16px', marginTop: '4px' }}>Alerts automatically sent to authorities</div>
        </div>

        <table className="cases-table">
          <thead>
            <tr>
              <th>Alert Details</th>
            </tr>
          </thead>
          <tbody>
            {fraudAlerts.map((alert, idx) => (
              <tr key={idx}>
                <td style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                  <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', color: '#1a1a18', background: '#faf9f6', padding: '12px', borderRadius: '6px', border: '1px solid #F1EFE8' }}>
                    {JSON.stringify(alert, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {fraudAlerts.length === 0 && (
              <tr>
                <td
                  style={{ textAlign: 'center', padding: '32px', color: '#888780' }}
                >
                  No system fraud alerts available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL PANEL */}
      {selectedCase && (
        <div className="overlay" onClick={() => setSelectedCase(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>

            <div className="detail-header">
              <div>
                <div className="detail-title">{selectedCase.name}</div>
                <div className="detail-sub">
                  {selectedCase.id} · {selectedCase.reg}
                </div>
              </div>
              <button
                className="detail-close"
                onClick={() => setSelectedCase(null)}
              >
                ✕
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <div className="detail-section-label">Trust Score</div>
                <div
                  className="detail-score"
                  style={{ color: getScoreColor(selectedCase.score) }}
                >
                  {selectedCase.score}
                  <span style={{ fontSize: 16, color: '#888780' }}> / 100</span>
                </div>

                <div className="detail-section-label" style={{ marginTop: 16 }}>
                  Squad Reference
                </div>
                <div className="mono" style={{ fontSize: 13, color: '#1a1a18' }}>
                  {selectedCase.txn}
                </div>

                <div className="detail-section-label" style={{ marginTop: 16 }}>
                  Extracted Fields
                </div>
                {Object.entries(selectedCase.extracted).map(([key, value]) => (
                  <div className="extracted-row" key={key}>
                    <span className="extracted-key">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="extracted-val">
                      {value || (
                        <span style={{ color: '#B4B2A9' }}>Not extracted</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <div className="detail-section-label">Flagged Anomalies</div>
                {selectedCase.flags.map((flag, i) => (
                  <div key={i} className={`flag-item flag-${flag.sev}`}>
                    <div className="flag-icon">
                      {flag.sev === 'high' ? '🔴'
                        : flag.sev === 'medium' ? '🟡'
                          : '🔵'}
                    </div>
                    <div>
                      <div className="flag-title">{flag.title}</div>
                      <div className="flag-desc">{flag.desc}</div>
                    </div>
                  </div>
                ))}

                <div className="detail-section-label" style={{ marginTop: 16 }}>
                  AI Reasoning
                </div>
                <div className="reasoning-block">
                  <div className="reasoning-tag">Model Analysis</div>
                  {selectedCase.reasoning}
                </div>
              </div>
            </div>

            {selectedCase.status === 'pending' && (
              <div className="detail-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setSelectedCase(null)}
                >
                  Defer
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleAction('blocked', selectedCase.id)}
                >
                  <i className="ti ti-circle-x" /> Confirm Block
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => handleAction('cleared', selectedCase.id)}
                >
                  <i className="ti ti-circle-check" /> Override & Clear
                </button>
              </div>
            )}

            {selectedCase.status !== 'pending' && (
              <div className="detail-actions">
                <div className={`resolved-badge ${selectedCase.status}`}>
                  {selectedCase.status === 'cleared'
                    ? '✅ Cleared by admin'
                    : '🚫 Blocked by admin'}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
