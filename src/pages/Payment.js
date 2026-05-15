import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Payment.css';

const SERVICE_FEE = 50000;
const PLATFORM_FEE = 2000;
const TOTAL_PAYOUT = SERVICE_FEE + PLATFORM_FEE;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const formatNaira = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);

const getAdminClearedCase = (form) => {
  if (!form) return null;

  const flaggedCases = JSON.parse(sessionStorage.getItem('flagged_cases') || '[]');
  return flaggedCases.find((c) =>
    c.status === 'cleared' &&
    (c.reg === form.regNumber || c.name === form.fullName)
  );
};

const getStoredPaymentReference = () => {
  const saved = sessionStorage.getItem('payment_reference');
  if (saved) return saved;

  const next = `MV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  sessionStorage.setItem('payment_reference', next);
  return next;
};

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(
    JSON.parse(sessionStorage.getItem('payment_result') || 'null')
  );

  const form = useMemo(
    () => JSON.parse(sessionStorage.getItem('medverify_form') || 'null'),
    []
  );
  const result = useMemo(
    () => JSON.parse(sessionStorage.getItem('dashboard_result') || 'null'),
    []
  );
  const adminClearedCase = useMemo(() => getAdminClearedCase(form), [form]);

  const trustScore = result?.trust_score || 0;
  const scoreEligible = trustScore >= 70;
  const adminEligible = Boolean(adminClearedCase);
  const eligible = scoreEligible || adminEligible;
  const transactionId = useMemo(() => getStoredPaymentReference(), []);
  const payerEmail = user?.email || 'payments@medverify.ng';

  const verificationChecks = [
    {
      label: adminEligible ? 'Admin override cleared' : 'Registry matched',
      passed: adminEligible || scoreEligible,
    },
    {
      label: 'Documents authentic',
      passed: eligible,
    },
    {
      label: adminEligible ? 'Manual review approved' : 'Trust score above threshold',
      passed: eligible,
    },
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference =
      params.get('transaction_ref') ||
      params.get('reference') ||
      params.get('transaction_reference');

    if (!reference || paymentResult?.status === 'success') return;

    const verifyPayment = async () => {
      setVerifyingPayment(true);
      setPaymentError('');

      try {
        const response = await axios.get(
          `${API_BASE_URL}/payments/squad/verify/${encodeURIComponent(reference)}`
        );
        const transaction = response.data?.data || {};
        const status = transaction.transaction_status;

        const nextResult = {
          status: status === 'Success' ? 'success' : 'pending',
          transactionId: transaction.transaction_ref || reference,
          gatewayReference: transaction.gateway_transaction_ref,
          gatewayStatus: status || 'Pending',
          amount: transaction.transaction_amount || TOTAL_PAYOUT * 100,
          releasedAt: status === 'Success' ? new Date().toISOString() : null,
        };

        sessionStorage.setItem('payment_result', JSON.stringify(nextResult));
        setPaymentResult(nextResult);

        if (status !== 'Success') {
          setPaymentError(`Squad returned ${status || 'Pending'} for this transaction.`);
        }
      } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        setPaymentError(`Unable to verify Squad payment: ${detail}`);
      } finally {
        setVerifyingPayment(false);
      }
    };

    verifyPayment();
  }, [location.search, paymentResult?.status]);

  const handleReleasePayment = async () => {
    setLoadingPayment(true);
    setPaymentError('');

    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;
      const response = await axios.post(`${API_BASE_URL}/payments/squad/initiate`, {
        email: payerEmail,
        amount: TOTAL_PAYOUT * 100,
        currency: 'NGN',
        initiate_type: 'inline',
        transaction_ref: transactionId,
        customer_name: form.fullName,
        callback_url: callbackUrl,
        payment_channels: ['card', 'bank', 'ussd', 'transfer'],
        metadata: {
          practitioner_name: form.fullName,
          reg_number: form.regNumber,
          specialty: form.specialty,
          trust_score: trustScore,
          admin_override: adminEligible,
        },
      });

      const checkoutUrl = response.data?.data?.checkout_url;
      const reference = response.data?.data?.transaction_ref || transactionId;

      const nextResult = {
        status: 'pending',
        transactionId: reference,
        amount: TOTAL_PAYOUT,
        checkoutUrl,
        initiatedAt: new Date().toISOString(),
      };

      sessionStorage.setItem('payment_reference', reference);
      sessionStorage.setItem('payment_result', JSON.stringify(nextResult));
      setPaymentResult(nextResult);
      setShowConfirm(false);

      if (!checkoutUrl) {
        throw new Error('Squad did not return a checkout URL.');
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      const detail = err.response
        ? err.response.data?.detail || err.response.data?.message || err.message
        : `Cannot reach ${API_BASE_URL}. Start the backend payment proxy on port 8000.`;
      setPaymentError(`Unable to start Squad checkout: ${detail}`);
    } finally {
      setLoadingPayment(false);
    }
  };

  if (!form || !result) {
    return (
      <div className="payment-page">
        <div className="payment-empty">
          <i className="ti ti-credit-card-off" />
          <div>No verified practitioner is ready for payment.</div>
          <button className="pay-btn pay-btn-primary" onClick={() => navigate('/submit')}>
            <i className="ti ti-arrow-left" /> Start Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-header">
        <div>
          <div className="payment-title">Payment Gateway</div>
          <div className="payment-sub">Release payment to verified practitioner via Squad</div>
        </div>
        <div className="payment-step-pill">
          <span className="pay-step done"><i className="ti ti-circle-check" /> Submit</span>
          <span className="pay-step-divider" />
          <span className="pay-step done"><i className="ti ti-circle-check" /> Verify</span>
          <span className="pay-step-divider" />
          <span className="pay-step active">3 Payment</span>
        </div>
      </div>

      <div className="payment-card practitioner-card">
        <div className="payment-card-title">Practitioner Payment</div>
        <div className="practitioner-grid">
          <div>
            <span>Name</span>
            <strong>{form.fullName}</strong>
          </div>
          <div>
            <span>Specialty</span>
            <strong>{form.specialty}</strong>
          </div>
          <div>
            <span>Reg Number</span>
            <strong className="pay-mono">{form.regNumber}</strong>
          </div>
          <div>
            <span>Hospital</span>
            <strong>{form.affiliation}</strong>
          </div>
          <div>
            <span>Trust Score</span>
            <strong className={eligible ? 'score-good' : 'score-bad'}>
              {trustScore} / 100
            </strong>
          </div>
          <div>
            <span>Status</span>
            <div className={`payment-status ${eligible ? 'eligible' : 'blocked'}`}>
              <i className={`ti ${eligible ? 'ti-circle-check' : 'ti-circle-x'}`} />
              {eligible ? 'Eligible for payment' : 'Payment blocked'}
            </div>
          </div>
        </div>
      </div>

      <div className="payment-two-col">
        <div className="payment-card">
          <div className="payment-card-title">Payment Summary</div>
          <div className="summary-row">
            <span>Service Fee</span>
            <strong>{formatNaira(SERVICE_FEE)}</strong>
          </div>
          <div className="summary-row">
            <span>Platform Fee</span>
            <strong>{formatNaira(PLATFORM_FEE)}</strong>
          </div>
          <div className="summary-total">
            <span>Total Payout</span>
            <strong>{formatNaira(TOTAL_PAYOUT)}</strong>
          </div>
        </div>

        <div className="payment-card">
          <div className="payment-card-title">Payment Method</div>
          <div className="method-tabs">
            <button>Wallet</button>
            <button>Card</button>
            <button className="selected">Bank Transfer</button>
          </div>
          <div className="bank-details">
            <div>
              <span>Bank Name</span>
              <strong>Access Bank</strong>
            </div>
            <div>
              <span>Account Name</span>
              <strong>{form.fullName}</strong>
            </div>
            <div>
              <span>Account Number</span>
              <strong className="pay-mono">0123456789</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="payment-card fraud-card">
        <div className="payment-card-title">Fraud Verification</div>
        <div className="fraud-checks">
          {verificationChecks.map((check) => (
            <div className={check.passed ? 'check-pass' : 'check-fail'} key={check.label}>
              <i className={`ti ${check.passed ? 'ti-circle-check' : 'ti-circle-x'}`} />
              {check.label}
            </div>
          ))}
        </div>
      </div>

      <div className={`payment-card action-card ${eligible ? '' : 'blocked-action'}`}>
        <div>
          <div className="payment-card-title">Release Payment</div>
          <div className="send-total">
            <span>Total to Send</span>
            <strong>{formatNaira(TOTAL_PAYOUT)}</strong>
          </div>
          {!eligible && (
            <div className="blocked-copy">
              Trust score below payout threshold. Admin review required.
            </div>
          )}
          {paymentResult?.status === 'success' && (
            <div className="success-result">
              <div className="success-title">
                <i className="ti ti-circle-check" /> Payment Successful
              </div>
              <span>Transaction ID</span>
              <strong className="pay-mono">{paymentResult.transactionId}</strong>
              <p>Verified by Squad</p>
            </div>
          )}
          {paymentResult?.status === 'pending' && (
            <div className="pending-result">
              <div className="pending-title">
                <i className="ti ti-clock" /> Squad Checkout Started
              </div>
              <span>Transaction ID</span>
              <strong className="pay-mono">{paymentResult.transactionId}</strong>
              <p>Complete checkout, then return here for verification.</p>
            </div>
          )}
          {(paymentError || verifyingPayment) && (
            <div className={paymentError ? 'payment-error' : 'payment-info'}>
              <i className={`ti ${paymentError ? 'ti-alert-circle' : 'ti-loader-2'}`} />
              {paymentError || 'Verifying payment with Squad...'}
            </div>
          )}
        </div>
        <button
          className="pay-btn pay-btn-primary"
          disabled={!eligible || loadingPayment || verifyingPayment || paymentResult?.status === 'success'}
          onClick={() => setShowConfirm(true)}
        >
          <i className={`ti ${loadingPayment || verifyingPayment ? 'ti-loader-2' : 'ti-send'}`} />
          {paymentResult?.status === 'success'
            ? 'Payment Verified'
            : loadingPayment
            ? 'Opening Squad...'
            : verifyingPayment
            ? 'Verifying...'
            : 'Pay with Squad'}
        </button>
      </div>

      {showConfirm && (
        <div className="payment-modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <i className="ti ti-shield-dollar" />
            </div>
            <div className="modal-title">Confirm Payment</div>
            <div className="modal-copy">
              Start a Squad checkout for {formatNaira(TOTAL_PAYOUT)}?
            </div>
            <div className="modal-actions">
              <button className="pay-btn pay-btn-ghost" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="pay-btn pay-btn-primary" onClick={handleReleasePayment} disabled={loadingPayment}>
                {loadingPayment ? 'Opening Squad...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
