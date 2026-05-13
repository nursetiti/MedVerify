import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Submission.css';

export default function Submission() {
  const navigate = useNavigate();
  const [files, setFiles] = useState({ mdcn: null, id: null });
  const [dragOver, setDragOver] = useState({ mdcn: false, id: false });
  const [form, setForm] = useState({
    fullName: '',
    regNumber: '',
    specialty: '',
    years: '',
    affiliation: '',
  });

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e, type) => {
    const file = e.target.files[0];
    if (file) setFiles({ ...files, [type]: file });
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    setDragOver({ ...dragOver, [type]: false });
    const file = e.dataTransfer.files[0];
    if (file) setFiles({ ...files, [type]: file });
  };

  const handleSubmit = (e) => {
  e.preventDefault();
  const { fullName, regNumber, specialty, years, affiliation } = form;

  if (!fullName || !regNumber || !specialty || !years || !affiliation) {
    alert('Please fill in all fields.');
    return;
  }
  if (!files.mdcn) {
    alert('Please upload your MDCN certificate.');
    return;
  }
  if (!files.id) {
    alert('Please upload your government-issued ID.');
    return;
  }

  // Save form to sessionStorage so it persists
  sessionStorage.setItem('medverify_form', JSON.stringify(form));

  // Navigate with the file in state (file objects can't go in sessionStorage)
  sessionStorage.setItem('verification_session_id', `VERIFY-${Date.now()}`);
  sessionStorage.removeItem('dashboard_result');
  sessionStorage.removeItem('payment_result');
  navigate('/dashboard', {
    state: {
      form,
      mdcnFile: files.mdcn
    }
  });
};

  return (
    <div className="submission-page">

      <div className="submission-header">
        <div>
          <h1 className="submission-title">Credential Submission</h1>
          <p className="submission-sub">Upload your credentials for AI verification before payment is released via Squad</p>
        </div>
        <div className="submission-step-pill">
          <span className="step active">1 Submit</span>
          <span className="step-divider" />
          <span className="step">2 Verify</span>
          <span className="step-divider" />
          <span className="step">3 Payment</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* PERSONAL INFO */}
        <div className="sub-card">
          <div className="sub-card-header">
            <div className="sub-card-icon">
              <i className="ti ti-user" />
            </div>
            <div>
              <div className="sub-card-title">Personal Information</div>
              <div className="sub-card-sub">Basic details about the practitioner</div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Full Name</label>
              <div className="input-wrap">
                <i className="ti ti-user-circle input-icon" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Dr. Amara Osei"
                  value={form.fullName}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-field">
              <label>MDCN Registration Number</label>
              <div className="input-wrap">
                <i className="ti ti-id-badge input-icon" />
                <input
                  type="text"
                  name="regNumber"
                  placeholder="MDCN/2019/45821"
                  value={form.regNumber}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Specialty</label>
              <select
                name="specialty"
                value={form.specialty}
                onChange={handleFormChange}
              >
                <option value="">Select specialty</option>
                <option>General Practice</option>
                <option>Internal Medicine</option>
                <option>Pediatrics</option>
                <option>Surgery</option>
                <option>Psychiatry</option>
                <option>Obstetrics & Gynecology</option>
                <option>Cardiology</option>
                <option>Dermatology</option>
                <option>Radiology</option>
                <option>Emergency Medicine</option>
              </select>
            </div>

            <div className="form-field">
              <label>Years of Practice</label>
              <div className="input-wrap">
                <i className="ti ti-calendar input-icon" />
                <input
                  type="number"
                  name="years"
                  placeholder="e.g. 5"
                  min="0"
                  max="60"
                  value={form.years}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-field form-full">
              <label>Hospital / Platform Affiliation</label>
              <div className="input-wrap">
                <i className="ti ti-building-hospital input-icon" />
                <input
                  type="text"
                  name="affiliation"
                  placeholder="Lagos University Teaching Hospital"
                  value={form.affiliation}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* DOCUMENT UPLOAD */}
        <div className="sub-card">
          <div className="sub-card-header">
            <div className="sub-card-icon">
              <i className="ti ti-file-certificate" />
            </div>
            <div>
              <div className="sub-card-title">Credential Documents</div>
              <div className="sub-card-sub">Upload clear copies — PDF, JPG, or PNG, max 5MB each</div>
            </div>
          </div>

          <div className="upload-grid">

            {/* MDCN Upload */}
            <div className="upload-slot">
              <div className="upload-label">
                MDCN Certificate <span className="upload-required">*</span>
              </div>
              <label
                className={`upload-zone ${dragOver.mdcn ? 'dragover' : ''} ${files.mdcn ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver({ ...dragOver, mdcn: true }); }}
                onDragLeave={() => setDragOver({ ...dragOver, mdcn: false })}
                onDrop={(e) => handleDrop(e, 'mdcn')}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFile(e, 'mdcn')}
                />
                {files.mdcn ? (
                  <div className="upload-success">
                    <i className="ti ti-circle-check upload-check" />
                    <div className="upload-filename">{files.mdcn.name}</div>
                    <div className="upload-filesize">
                      {(files.mdcn.size / 1024).toFixed(0)} KB — click to replace
                    </div>
                  </div>
                ) : (
                  <div className="upload-empty">
                    <div className="upload-icon-wrap">
                      <i className="ti ti-file-upload" />
                    </div>
                    <div className="upload-text">
                      <strong>Click to upload</strong> or drag & drop
                    </div>
                    <div className="upload-hint">PDF, JPG, PNG — max 5MB</div>
                  </div>
                )}
              </label>
            </div>

            {/* ID Upload */}
            <div className="upload-slot">
              <div className="upload-label">
                Government-Issued ID <span className="upload-required">*</span>
              </div>
              <label
                className={`upload-zone ${dragOver.id ? 'dragover' : ''} ${files.id ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver({ ...dragOver, id: true }); }}
                onDragLeave={() => setDragOver({ ...dragOver, id: false })}
                onDrop={(e) => handleDrop(e, 'id')}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFile(e, 'id')}
                />
                {files.id ? (
                  <div className="upload-success">
                    <i className="ti ti-circle-check upload-check" />
                    <div className="upload-filename">{files.id.name}</div>
                    <div className="upload-filesize">
                      {(files.id.size / 1024).toFixed(0)} KB — click to replace
                    </div>
                  </div>
                ) : (
                  <div className="upload-empty">
                    <div className="upload-icon-wrap">
                      <i className="ti ti-id-badge" />
                    </div>
                    <div className="upload-text">
                      <strong>Click to upload</strong> or drag & drop
                    </div>
                    <div className="upload-hint">PDF, JPG, PNG — max 5MB</div>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="submission-footer">
          <div className="submission-notice">
            <i className="ti ti-lock" />
            Your documents are encrypted and used solely for verification purposes
          </div>
          <button className="btn-submit" type="submit">
            <i className="ti ti-shield-check" />
            Run Verification
          </button>
        </div>

      </form>
    </div>
  );
}
