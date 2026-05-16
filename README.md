# MedVerify 🏥
> AI-Powered Healthcare Credential Verification & Payment Gating

**Squad Hackathon 3.0 — Challenge 01: Proof of Life | Healthcare Domain | Team Dibs**

---

## The Problem

Fake doctors are getting paid. Telemedicine platforms in Nigeria are onboarding unverified practitioners, and no system currently gates payment on real-time credential verification. The MDCN has repeatedly flagged this — but verification remains manual, slow, and bypassable.

**MedVerify fixes that.**

---



> *"Before a telemedicine platform pays a doctor, MedVerify verifies they're real."*

---

## Live URLs

| Service | URL |
|---|---|
| **Backend (Node)** | https://medverify-j9f5.onrender.com |
| **ML API (FastAPI)** | https://medverify-api.onrender.com |
| **ML API Docs** | https://medverify-api.onrender.com/docs |
| **Fraud Alerts Log** | https://medverify-api.onrender.com/fraud-alerts |

> ⚠️ All services run on Render's free tier and sleep after inactivity. If a request takes ~50 seconds on first load, it's waking up — try again immediately after.

---

## How the Full System Works

MedVerify is a three-part system. Here's how all the pieces connect:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  Credential upload form → Trust score dashboard → Admin     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP requests
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js)                         │
│  Receives upload → calls ML API → reads trust score         │
│  If CLEAR → calls Squad API to initiate payment             │
│  If BLOCK → stops payment, logs case                        │
└──────────┬───────────────────────────┬──────────────────────┘
           │ POST /verify              │ Squad API calls
           ▼                           ▼
┌─────────────────────┐   ┌────────────────────────────────────┐
│   ML API (FastAPI)  │   │         SQUAD APIs                 │
│  CV model           │   │  Payment Initiation                │
│  NLP extraction     │   │  Dynamic Virtual Accounts          │
│  Trust scoring      │   │  Transfer / Payout API             │
│  Fraud alerts       │   │  Webhooks (HMAC SHA512)            │
└─────────────────────┘   └────────────────────────────────────┘
```

### The Payment Flow in Plain English

1. A practitioner applies to join a telemedicine platform and submits their MDCN credentials
2. The platform's admin uploads the credential through the MedVerify dashboard
3. The frontend sends the image to the backend
4. The backend forwards it to the ML API (`POST /verify`)
5. The ML API runs computer vision + NLP + trust scoring and returns a decision
6. The backend reads the `decision` field:
   - **CLEAR (≥70)** → Backend calls Squad's Payment API to create/fund the practitioner's account
   - **REVIEW (45–69)** → Payment is held, admin is notified to manually review
   - **BLOCK (<45)** → Payment is stopped entirely, case is flagged in the admin panel
   - **ALERT (<30)** → Payment is blocked AND MDCN authorities are automatically notified

---

## Repository Structure

```
MedVerify/
├── README.md                  ← You are here
│
├── ML/                        ← ML Engineer (Adekunle Balqees Kofoworola)
│   ├── api.py                 # FastAPI app — main /verify endpoint
│   ├── cv_pipeline.py         # Computer vision — EfficientNet tampering detection
│   ├── nlp_pipeline.py        # NLP extraction + MDCN registry cross-reference
│   ├── generate_dataset.py    # Synthetic MDCN credential image generator
│   ├── generate_registry.py   # Mock MDCN registry generator (200 records)
│   ├── mock_registry.json     # Synthetic MDCN practitioner registry
│   └── requirements.txt       # Python dependencies
│
├── frontend/                  ← Frontend Devs (Nosirat Alade + Oluwatimilehin Okusanya)
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Upload page, dashboard, admin panel
│   │   └── App.js             # Main React app
│   ├── package.json
│   └── README.md
│
└── backend/                   ← Backend Developer (Ajiboye Peter)
    ├── src/
    │   ├── routes/            # API routes
    │   ├── controllers/       # Business logic + Squad API integration
    │   └── index.js           # Entry point
    ├── package.json
    └── README.md
```

---

## Setting Up Locally

### Prerequisites
- **Python 3.9+** (for ML API)
- **Node.js 18+** (for frontend and backend)
- **Tesseract OCR** — [Windows installer](https://github.com/UB-Mannheim/tesseract/wiki) | Linux: `sudo apt install tesseract-ocr` | Mac: `brew install tesseract`

---

### 1. ML API (FastAPI)

```bash
cd ML
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Generate the mock registry first
python generate_registry.py

# Generate synthetic credential images (optional — for testing)
python generate_dataset.py

# Start the ML API
uvicorn api:app --reload --port 8000
```

ML API runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

---

### 2. Backend (Node.js)

```bash
cd backend
npm install

# Create a .env file with your Squad API keys
# SQUAD_SECRET_KEY=your_squad_key
# ML_API_URL=https://medverify-api.onrender.com
# PORT=3000

npm start
```

Backend runs at: `http://localhost:3000`

---

### 3. Frontend (React)

```bash
cd frontend
npm install

# Create a .env file
# REACT_APP_BACKEND_URL=http://localhost:3000

npm start
```

Frontend runs at: `http://localhost:3001`

---

## ML API Reference

### `POST /verify`
The core endpoint. Accepts a credential image, returns a full trust score report.

**How to call it:**
```bash
curl -X POST https://medverify-api.onrender.com/verify \
  -F "file=@credential.png"
```

**Response:**
```json
{
  "trust_score": 74.2,
  "decision": "CLEAR",
  "decision_label": "Payment Cleared",
  "flags": [],
  "score_breakdown": {
    "cv_authenticity": 31.5,
    "registry_match": 27.2,
    "field_completeness": 10.5,
    "registry_status": 10.0
  },
  "extracted_fields": {
    "name": "Dr. Aminu Bello",
    "reg_number": "MDCN/2021/12345",
    "specialty": "General Practice",
    "status": "active"
  },
  "alert_sent": false,
  "alert_message": null
}
```

**Decision values:**

| Decision | Score Range | What Happens |
|---|---|---|
| `CLEAR` | ≥ 70 | Backend calls Squad to release payment |
| `REVIEW` | 45–69 | Payment held, admin manually reviews |
| `BLOCK` | < 45 | Payment blocked, case flagged |
| `ALERT` | < 30 | Blocked + MDCN authorities notified |

**Possible flags:**

| Flag | Meaning |
|---|---|
| `document_tampering_detected` | CV model found forgery signals |
| `registry_mismatch` | Name or reg number doesn't match MDCN registry |
| `incomplete_fields` | OCR couldn't read all credential fields |
| `practitioner_revoked` | Found in registry but license revoked |
| `practitioner_inactive` | Found but license is inactive |
| `not_found_in_registry` | Not found in MDCN registry at all |

### `GET /fraud-alerts`
Returns all automatically triggered fraud alerts (trust score < 30).

### `GET /health`
Returns API status and registry record count.

---

## Squad API Integration

Squad is the enforcement layer in MedVerify — not a demo bolt-on. The backend integrates Squad directly based on the ML API's decision:

| Squad API | When It's Called |
|---|---|
| **Payment Initiation** | Only when trust score ≥ 70 (CLEAR) |
| **Dynamic Virtual Accounts** | Created per verified practitioner at onboarding |
| **Transfer / Payout API** | Releases consultation fees after each session |
| **Webhooks (HMAC SHA512)** | Intercepts and blocks payments from unverified practitioners |

> **Key principle:** The backend never calls Squad unless MedVerify returns `decision: "CLEAR"`. Remove MedVerify and Squad has no gate. Remove Squad and the verified practitioner can never be paid. They are architecturally inseparable.

---

## The Four Pillars

| Pillar | How MedVerify Addresses It |
|---|---|
| **AI Automation** | CV model (EfficientNetB0) + NLP pipeline automate verification end-to-end — no human in the AI decision loop |
| **Use of Data** | Trust Score combines CV tampering signals, NLP registry match, field completeness, and license status into one interpretable score |
| **Squad APIs** | Payment initiation, dynamic virtual accounts, payouts, and webhooks are all gated by our verification result |
| **Financial Innovation** | Adds a trust layer to healthcare payments — transforming how platforms verify practitioners before any money moves |

---

## The Team

| Name | Role | What They Built |
|---|---|---|
| **Adekunle Balqees Kofoworola** | ML Engineer | CV pipeline, NLP extractor, trust scoring engine, fraud alert system, FastAPI deployment |
| **Ajiboye Peter** | Backend Developer | Squad API integration, REST API layer, database, webhook logic, system architecture |
| **Nosirat Alade** | Frontend Developer | Credential upload form, trust score dashboard, real-time decision display, UI/UX |
| **Oluwatimilehin Okusanya** | Frontend Developer | Admin fraud review panel, flagged cases table, fraud alert UI, ML API integration |

---

## Research & Validation

| Source | Finding |
|---|---|
| **MDCN Public Statements** | Repeatedly warned about unregistered practitioners on Nigerian digital health platforms |
| **Nigeria Health Watch (2023)** | Documented fake doctors operating telemedicine services with patients receiving dangerous advice |
| **WHO Digital Health Report** | Credential fraud is a top-3 barrier to digital health trust across Sub-Saharan Africa |
| **Our Market Research** | No Nigerian telemedicine platform currently gates Squad or any payment API on real-time credential verification |

---

*Built for Squad Hackathon 3.0 — Smart Systems: The Intelligent Economy*
