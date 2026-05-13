import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const API_URL = 'http://localhost:8000/verify';

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

const getFlagLabel = (flag) => {
  const labels = {
    document_tampering_detected: 'Document tampering detected',
    registry_mismatch: 'Registry mismatch',
    incomplete_fields: 'Incomplete OCR fields',
    practitioner_revoked: 'Practitioner licence revoked',
    practitioner_inactive: 'Practitioner marked inactive',
    not_found_in_registry: 'Not found in MDCN registry',
  };
  return labels[flag] || flag.replace(/_/g, ' ');
};

const getFlagSeverity = (flag) => {
  if (flag.includes('tampering') || flag.includes('revoked')) return 'high';
  if (flag.includes('mismatch') || flag.includes('inactive')) return 'medium';
  return 'low';
};

const saveFlaggedCase = (resultData, formData) => {
  if (resultData.decision === 'BLOCK' || resultData.decision === 'REVIEW') {
    const existing = JSON.parse(sessionStorage.getItem('flagged_cases') || '[]');
    const newCase = {
      id: `CASE-${Date.now()}`,
      name: formData.fullName,
      reg: formData.regNumber,
      specialty: formData.specialty,
      score: resultData.trust_score,
      status: 'pending',
      topFlag: resultData.flags?.[0]
        ? getFlagLabel(resultData.flags[0])
        : 'Anomaly detected',
      submitted: 'Just now',
      txn: `TXN-${Math.floor(80000 + Math.random() * 9999)}`,
      flags: resultData.flags?.map(f => ({
        sev: getFlagSeverity(f),
        title: getFlagLabel(f),
        desc: getFlagDesc(f),
      })) || [],
      reasoning: `Trust score of ${resultData.trust_score}/100. ${resultData.decision_label}`,
      extracted: resultData.extracted_fields || {},
    };
    existing.unshift(newCase);
    sessionStorage.setItem('flagged_cases', JSON.stringify(existing));
    console.log('✅ Flagged case saved to sessionStorage:', newCase);
  } else {
    console.log('ℹ️ Score is CLEAR — not saving to admin');
  }
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [mdcnFile, setMdcnFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Scanning credential document...');
  const [result, setResult] = useState(null);

  const loadingSteps = [
    'Scanning credential document...',
    'Running computer vision check...',
    'Cross-referencing MDCN registry...',
    'Computing trust score...',
    'Finalising report...',
  ];

  useEffect(() => {
  const stateForm = location.state?.form;
  const stateFile = location.state?.mdcnFile;
  const savedForm = sessionStorage.getItem('medverify_form');
  const savedResult = sessionStorage.getItem('dashboard_result');

  if (stateForm) {
    setForm(stateForm);
  } else if (savedForm) {
    setForm(JSON.parse(savedForm));
  }

  if (stateFile) {
    setMdcnFile(stateFile);
  } else if (savedResult) {
    // No new file — just restore previous result
    setResult(JSON.parse(savedResult));
  }
}, [location.state]);

  useEffect(() => {
    if (form && mdcnFile && !result && !loading) {
      runVerification(mdcnFile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, mdcnFile]);

  const generateMockResult = (formData) => {
    // Wide range so we get BLOCK/REVIEW/CLEAR results
    const score = Math.floor(20 + Math.random() * 75);
    const decision = score >= 70 ? 'CLEAR' : score >= 50 ? 'REVIEW' : 'BLOCK';
    const flags = [];
    if (score < 70) flags.push('registry_mismatch');
    if (score < 50) flags.push('document_tampering_detected');
    if (score < 80) flags.push('incomplete_fields');

    return {
      trust_score: score,
      decision,
      decision_label:
        decision === 'CLEAR'
          ? 'Payment Cleared'
          : decision === 'REVIEW'
          ? 'Flag for Manual Review'
          : 'Payment Blocked',
      flags,
      score_breakdown: {
        cv_authenticity: parseFloat((score * 0.4).toFixed(1)),
        registry_match: parseFloat((score * 0.35).toFixed(1)),
        field_completeness: parseFloat((score * 0.15).toFixed(1)),
        registry_status: parseFloat((score * 0.10).toFixed(1)),
      },
      extracted_fields: {
        name: formData?.fullName || null,
        reg_number: formData?.regNumber || null,
        specialty: formData?.specialty || null,
        status: score >= 70 ? 'active' : 'unknown',
      },
      matched_record: score >= 50 ? {
        name: formData?.fullName,
        reg_number: formData?.regNumber,
        specialty: formData?.specialty,
        status: score >= 70 ? 'active' : 'inactive',
        state: 'Lagos',
        institution: formData?.affiliation,
      } : null,
      alert_sent: score < 30,
      alert_message: score < 30 ? 'Fraud alert has been sent to MDCN authorities.' : null,
    };
  };

  const runVerification = async (file) => {
    setLoading(true);

    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      if (step < loadingSteps.length) {
        setLoadingText(loadingSteps[step]);
      }
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(API_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      clearInterval(stepInterval);
      setResult(response.data);
      sessionStorage.setItem('dashboard_result', JSON.stringify(response.data));
      saveFlaggedCase(response.data, form);

    } catch (err) {
      clearInterval(stepInterval);
      console.error('API error:', err.message);

      const mockResult = generateMockResult(form);
      setResult(mockResult);
      sessionStorage.setItem('dashboard_result', JSON.stringify(mockResult));
      saveFlaggedCase(mockResult, form);

    } finally {
      setLoading(false);
    }
  };

  const getScoreOffset = (score) => 327 - (score / 100) * 327;

  const getScoreColor = (score) => {
    if (score >= 70) return '#1D9E75';
    if (score >= 50) return '#BA7517';
    return '#C94040';
  };

  const getVerdictClass = (decision) => {
    if (decision === 'CLEAR') return 'cleared';
    if (decision === 'BLOCK') return 'blocked';
    return 'review';
  };

  const getSquadStatus = (decision) => {
    if (decision === 'CLEAR') return { text: 'Released to practitioner', color: '#1D9E75', icon: 'ti-circle-check' };
    if (decision === 'BLOCK') return { text: 'Payment blocked', color: '#C94040', icon: 'ti-circle-x' };
    return { text: 'On hold — pending review', color: '#BA7517', icon: 'ti-alert-circle' };
  };

  const txnRef = `TXN-${Math.floor(80000 + Math.random() * 9999)}`;

  return (
    <div className="dash">

      {/* HEADER */}
      <div className="dash-header">
        <div>
          <div className="dash-title">Trust Score Dashboard</div>
          <div className="dash-sub">
            {form
              ? `AI verification result for ${form.fullName} · ${form.regNumber}`
              : 'AI verification result'}
          </div>
        </div>
        <div className="dash-step-pill">
          <span className="step done"><i className="ti ti-circle-check" /> Submit</span>
          <span className="step-divider" />
          <span className="step active">2 Verify</span>
          <span className="step-divider" />
          <span className={`step ${result ? 'done' : ''}`}>3 Payment</span>
        </div>
      </div>

      {/* NO FORM DATA */}
      {!form && !loading && (
        <div className="dash-empty">
          <i className="ti ti-file-off" style={{ fontSize: 32, color: '#B4B2A9' }} />
          <p>No submission data found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/submit')}>
            <i className="ti ti-arrow-left" /> Go to Credential Submission
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="dash-loading">
          <div className="loading-card">
            <div className="loading-spinner" />
            <div className="loading-title">Verifying credentials...</div>
            <div className="loading-sub">{loadingText}</div>
            <div className="loading-steps">
              {loadingSteps.map((s, i) => (
                <div
                  key={i}
                  className={`loading-step ${loadingSteps.indexOf(loadingText) >= i ? 'done' : ''}`}
                >
                  <i className={`ti ${loadingSteps.indexOf(loadingText) >= i ? 'ti-circle-check' : 'ti-circle'}`} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {result && !loading && (
        <>
          {result.alert_sent && (
            <div className="alert-banner">
              <i className="ti ti-bell-ringing" />
              {result.alert_message}
            </div>
          )}

          {/* TOP ROW */}
          <div className="top-grid">
            <div className="score-card">
              <div className="score-ring">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r="52" fill="none" stroke="#F1EFE8" strokeWidth="10" />
                  <circle
                    cx="65" cy="65" r="52" fill="none"
                    stroke={getScoreColor(result.trust_score)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="327"
                    strokeDashoffset={getScoreOffset(result.trust_score)}
                    style={{
                      transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center'
                    }}
                  />
                </svg>
                <div className="score-number">
                  <span className="score-val" style={{ color: getScoreColor(result.trust_score) }}>
                    {result.trust_score}
                  </span>
                  <span className="score-denom">/ 100</span>
                </div>
              </div>
              <div className={`verdict ${getVerdictClass(result.decision)}`}>
                <i className={`ti ${result.decision === 'CLEAR'
                  ? 'ti-circle-check'
                  : result.decision === 'BLOCK'
                  ? 'ti-circle-x'
                  : 'ti-alert-circle'}`}
                />
                {result.decision_label}
              </div>
              <div className="score-time">
                Verified at {new Date().toLocaleTimeString()}
              </div>
            </div>

            <div className="right-col">
              <div className="info-card">
                <div className="card-label">Practitioner</div>
                <div className="info-grid">
                  <div>
                    <div className="info-item-label">Full name</div>
                    <div className="info-item-val">{form?.fullName || '—'}</div>
                  </div>
                  <div>
                    <div className="info-item-label">Reg. number</div>
                    <div className="info-item-val mono" style={{ fontSize: 12 }}>
                      {form?.regNumber || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="info-item-label">Specialty</div>
                    <div className="info-item-val">{form?.specialty || '—'}</div>
                  </div>
                  <div>
                    <div className="info-item-label">Affiliation</div>
                    <div className="info-item-val" style={{ fontSize: 12 }}>
                      {form?.affiliation || '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="squad-card">
                <div className="card-label">Squad Payment Gateway</div>
                <div className="squad-bar">
                  <div>
                    <div className="squad-label">Payment status</div>
                    <div
                      className="squad-status"
                      style={{ color: getSquadStatus(result.decision).color }}
                    >
                      <i className={`ti ${getSquadStatus(result.decision).icon}`} />
                      {getSquadStatus(result.decision).text}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="squad-label">Reference</div>
                    <div className="mono squad-ref">{txnRef}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MID ROW */}
          <div className="mid-grid">
            <div className="card">
              <div className="card-label">Score Breakdown</div>
              {Object.entries(result.score_breakdown).map(([key, value]) => {
                const maxMap = {
                  cv_authenticity: 40,
                  registry_match: 35,
                  field_completeness: 15,
                  registry_status: 10,
                };
                const labelMap = {
                  cv_authenticity: 'CV Authenticity',
                  registry_match: 'Registry Match',
                  field_completeness: 'Field Completeness',
                  registry_status: 'Registry Status',
                };
                const max = maxMap[key] || 100;
                const pct = Math.round((value / max) * 100);
                const color = pct >= 70 ? '#1D9E75' : pct >= 50 ? '#BA7517' : '#C94040';
                return (
                  <div className="breakdown-row" key={key}>
                    <div className="breakdown-top">
                      <span className="breakdown-name">{labelMap[key] || key}</span>
                      <span>
                        <span className="breakdown-val" style={{ color }}>{value}</span>
                        <span className="breakdown-max"> / {max}</span>
                      </span>
                    </div>
                    <div className="bar-bg">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div className="card-label">Flagged Anomalies</div>
              {result.flags && result.flags.length > 0 ? (
                result.flags.map((flag, i) => {
                  const sev = getFlagSeverity(flag);
                  return (
                    <div key={i} className={`flag-item flag-${sev}`}>
                      <div className="flag-icon">
                        {sev === 'high' ? '🔴' : sev === 'medium' ? '🟡' : '🔵'}
                      </div>
                      <div>
                        <div className="flag-title">{getFlagLabel(flag)}</div>
                        <div className="flag-desc">{getFlagDesc(flag)}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-flags">
                  <i className="ti ti-circle-check" style={{ color: '#1D9E75', fontSize: 22 }} />
                  <div>No anomalies detected</div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ROW */}
          <div className="bottom-grid">
            <div className="card">
              <div className="card-label">Extracted Fields (OCR)</div>
              <div className="fields-grid">
                {result.extracted_fields &&
                  Object.entries(result.extracted_fields).map(([key, value]) => {
                    const matched = result.matched_record;
                    const isMatch =
                      matched && value && matched[key]
                        ? matched[key]
                            .toString()
                            .toLowerCase()
                            .includes(value.toString().toLowerCase())
                        : null;
                    return (
                      <div className="field-item" key={key}>
                        <div className="field-label">{key.replace(/_/g, ' ')}</div>
                        <div className="field-val">
                          {value || (
                            <span style={{ color: '#B4B2A9' }}>Not extracted</span>
                          )}
                        </div>
                        {value && (
                          <div
                            className="field-match"
                            style={{
                              color: isMatch
                                ? '#1D9E75'
                                : isMatch === false
                                ? '#C94040'
                                : '#888780',
                            }}
                          >
                            <i
                              className={`ti ${
                                isMatch
                                  ? 'ti-circle-check'
                                  : isMatch === false
                                  ? 'ti-circle-x'
                                  : 'ti-minus'
                              }`}
                              style={{ fontSize: 11 }}
                            />
                            {isMatch
                              ? 'Registry match'
                              : isMatch === false
                              ? 'Mismatch'
                              : 'Extracted'}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="card">
              <div className="card-label">Matched Registry Record</div>
              {result.matched_record ? (
                <div className="fields-grid">
                  {['name', 'reg_number', 'specialty', 'status', 'state', 'institution'].map(
                    (key) =>
                      result.matched_record[key] && (
                        <div className="field-item" key={key}>
                          <div className="field-label">{key.replace(/_/g, ' ')}</div>
                          <div
                            className="field-val"
                            style={
                              key === 'status'
                                ? {
                                    color:
                                      result.matched_record[key] === 'active'
                                        ? '#1D9E75'
                                        : '#C94040',
                                    textTransform: 'capitalize',
                                  }
                                : {}
                            }
                          >
                            {result.matched_record[key]}
                          </div>
                        </div>
                      )
                  )}
                </div>
              ) : (
                <div className="no-flags">
                  <i
                    className="ti ti-database-off"
                    style={{ color: '#C94040', fontSize: 22 }}
                  />
                  <div>No matching record found in MDCN registry</div>
                </div>
              )}

              <div className="divider" />
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => navigate('/submit')}>
                  <i className="ti ti-arrow-left" /> New Verification
                </button>
                {result.decision === 'BLOCK' && (
                  <button
                    className="btn btn-danger"
                    onClick={() => navigate('/admin')}
                  >
                    <i className="ti ti-flag" /> Flag for Review
                  </button>
                )}
                {result.decision === 'CLEAR' && (
                  <button className="btn btn-primary">
                    <i className="ti ti-download" /> Export Report
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
