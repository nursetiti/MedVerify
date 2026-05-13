import { useState, useEffect } from 'react';
import './Admin.css';

const MOCK_CASES = [
  {
    id: 'CASE-001',
    name: 'Dr. Emeka Nwosu',
    reg: 'MDCN/2020/11032',
    specialty: 'Surgery',
    score: 31,
    status: 'pending',
    topFlag: 'Document tampering detected',
    submitted: '2h ago',
    txn: 'TXN-88201',
    flags: [
      { sev: 'high', title: 'Document tampering detected', desc: 'CV model detected image manipulation signals in the uploaded certificate with high confidence.' },
      { sev: 'high', title: 'Registry mismatch', desc: 'Registration number MDCN/2020/11032 returned no strong match in the MDCN registry.' },
      { sev: 'medium', title: 'Incomplete OCR fields', desc: 'Specialty and registration date could not be extracted from the document.' },
    ],
    reasoning: 'Multiple high-severity signals detected. CV model flagged tampering with high confidence and registry cross-reference failed. Payment blocked pending manual review.',
    extracted: { name: 'Dr. Emeka Nwosu', reg_number: 'MDCN/2020/11032', specialty: null, status: null },
  },
  {
    id: 'CASE-002',
    name: 'Dr. Fatima Bello',
    reg: 'MDCN/2018/07741',
    specialty: 'Internal Medicine',
    score: 58,
    status: 'pending',
    topFlag: 'Specialty mismatch with registry',
    submitted: '5h ago',
    txn: 'TXN-88187',
    flags: [
      { sev: 'medium', title: 'Specialty mismatch', desc: 'Practitioner claims Internal Medicine but registry record shows General Practice.' },
      { sev: 'low', title: 'Incomplete OCR fields', desc: 'Registration date field could not be fully extracted from the uploaded image.' },
    ],
    reasoning: 'Moderate concern. Specialty mismatch could reflect an upgrade not yet reflected in the registry. Recommend requesting updated registry confirmation before clearing payment.',
    extracted: { name: 'Dr. Fatima Bello', reg_number: 'MDCN/2018/07741', specialty: 'Internal Medicine', status: 'active' },
  },
  {
    id: 'CASE-003',
    name: 'Dr. Kwame Asante',
    reg: 'MDCN/2015/00320',
    specialty: 'Pediatrics',
    score: 44,
    status: 'pending',
    topFlag: 'Practitioner marked inactive in registry',
    submitted: 'Yesterday',
    txn: 'TXN-88102',
    flags: [
      { sev: 'high', title: 'Practitioner inactive', desc: 'Registry record shows this practitioner is currently marked as inactive.' },
      { sev: 'medium', title: 'Registry mismatch', desc: 'Name fuzzy match score is below threshold — possible identity discrepancy.' },
    ],
    reasoning: 'Practitioner registry status is inactive. Payment must remain blocked until status is confirmed through official MDCN channels.',
    extracted: { name: 'Dr. Kwame Asante', reg_number: 'MDCN/2015/00320', specialty: 'Pediatrics', status: 'inactive' },
  },
];

const getFlagDesc = (flag) => {
  const descs = {
    document_tampering_detected: 'CV model detected image manipulation signals in the uploaded certificate with high confidence.',
    registry_mismatch: 'Extracted fields do not strongly match any record in the MDCN registry database.',
    incomplete_fields: 'Some credential fields could not be fully extracted from the image.',
    practitioner_revoked: 'The matched registry record shows this practitioner licence has been revoked.',
    practitioner_inactive: 'The matched registry record shows this practitioner is currently inactive.',
    not_found_in_registry: 'The registration number could not be matched to any record in the MDCN registry.',
  };
  return descs[flag] || 'Anomaly detected during verification.';
};

const CASE_STATUS_OVERRIDES_KEY = 'admin_case_statuses';
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
  const [autoVerifiedCount, setAutoVerifiedCount] = useState(0);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem('flagged_cases') || '[]');
    const statusOverrides = JSON.parse(sessionStorage.getItem(CASE_STATUS_OVERRIDES_KEY) || '{}');
    const mockCases = MOCK_CASES.map(c => ({
      ...c,
      status: statusOverrides[c.id] || c.status,
    }));
    const loadedCases = [...saved, ...mockCases];

    setCases(loadedCases);
    setAutoVerifiedCount(Number(sessionStorage.getItem(AUTO_VERIFIED_COUNT_KEY) || '0'));
    publishFlaggedPendingCount(loadedCases);
  }, []);

  // const stats = {
  //   total: 1247,
  //   cleared: 1189,
  //   blocked: 55,
  //   pending: cases.filter(c => c.status === 'pending').length,
  // };

  const BASE_STATS = {
    cleared: 1189,
    blocked: 55,
  };

  const stats = {
    cleared: BASE_STATS.cleared + autoVerifiedCount + cases.filter(c => c.status === 'cleared').length,
    blocked: BASE_STATS.blocked + cases.filter(c => c.status === 'blocked').length,
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
      c.id === caseId ? { ...c, status: action } : c
    );
    setCases(updated);

    // Update sessionStorage too
    const saved = updated.filter(c => !MOCK_CASES.find(m => m.id === c.id));
    const statusOverrides = JSON.parse(sessionStorage.getItem(CASE_STATUS_OVERRIDES_KEY) || '{}');
    if (MOCK_CASES.find(m => m.id === caseId)) {
      statusOverrides[caseId] = action;
    }

    sessionStorage.setItem('flagged_cases', JSON.stringify(saved));
    sessionStorage.setItem(CASE_STATUS_OVERRIDES_KEY, JSON.stringify(statusOverrides));
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
          <div className="stat-sub">↑ 12 today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cleared</div>
          <div className="stat-val" style={{ color: '#1D9E75' }}>{stats.cleared.toLocaleString()}</div>
          <div className="stat-sub">95.3% rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Blocked</div>
          <div className="stat-val" style={{ color: '#C94040' }}>{stats.blocked.toLocaleString()}</div>
          <div className="stat-sub">4.4% fraud rate</div>
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
