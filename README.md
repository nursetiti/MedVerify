# MedVerify 🏥
> AI-Powered Healthcare Credential Verification & Payment Gating

**Squad Hackathon 3.0 — Challenge 01: Proof of Life | Healthcare Domain | Team Dibs**

---

## The Problem

Fake doctors are getting paid. Telemedicine platforms in Nigeria are onboarding unverified practitioners, and no system currently gates payment on credential verification. The MDCN has repeatedly flagged this — but verification remains manual, slow, and bypassable.

**MedVerify fixes that.**

---

## One Line Pitch

> *"Before a telemedicine platform pays a doctor, MedVerify verifies they're real."*

---

## Live Demo

| | |
|---|---|
| **Live API** | https://medverify-api.onrender.com |
| **API Docs** | https://medverify-api.onrender.com/docs |
| **Health Check** | https://medverify-api.onrender.com/health |
| **Fraud Alerts Log** | https://medverify-api.onrender.com/fraud-alerts |

> ⚠️ The API runs on Render's free tier and sleeps after inactivity. Hit the health check URL first to wake it up before testing.

---

## How It Works

```
Platform submits practitioner credential (MDCN cert + ID)
                    ↓
     CV model scans for document tampering
                    ↓
  NLP extracts fields + cross-references MDCN registry
                    ↓
      Trust Score generated (0–100) with flags
                    ↓
Score ≥ 70  →  Squad payment API fires       ✅ CLEAR
Score 45–69 →  Payment held, admin reviews   ⚠️ REVIEW
Score < 45  →  Payment blocked, case flagged 🚫 BLOCK
Score < 30  →  Blocked + MDCN alerted        🚨 ALERT
```

---

## Repository Structure

```
MedVerify/
├── README.md                  ← You are here
│
├── ML/                        ← ML Engineer (Adekunle Balqees Kofoworola)
│   ├── api.py                 # FastAPI app — main verification endpoint
│   ├── cv_pipeline.py         # Computer vision — EfficientNet tampering detection
│   ├── nlp_pipeline.py        # NLP extraction + MDCN registry cross-reference
│   ├── generate_dataset.py    # Synthetic credential image generator
│   ├── generate_registry.py   # Mock MDCN registry generator
│   ├── mock_registry.json     # Synthetic MDCN practitioner registry (200 records)
│   └── requirements.txt       # Python dependencies
│
├── frontend/                  ← Frontend Developers (Nosirat Alade + Oluwatimilehin Okusanya)
│   └── ...                    # Credential upload form, trust score dashboard, admin panel
│
└── backend/                   ← Backend Developer (Ajiboye Peter)
    └── ...                    # Squad API integration, REST API, database, webhooks
```

---

## API Reference

### `POST /verify`
Accepts a credential image, returns a full trust score report.

**Request:**
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

### `GET /fraud-alerts`
Returns all triggered fraud alerts (score < 30).

### `GET /health`
Returns API status and registry record count.

---

## Squad API Integration

MedVerify uses Squad APIs as the enforcement layer — not a demo bolt-on:

| Squad API | How We Use It |
|---|---|
| **Payment Initiation** | Called only when Trust Score ≥ 70 (CLEAR) |
| **Dynamic Virtual Accounts** | Created per verified practitioner at onboarding |
| **Transfer / Payout API** | Releases fees after each verified consultation |
| **Webhooks (HMAC SHA512)** | Blocks payments from unverified practitioners |

> Remove Squad and the product stops working. It is architecturally central.

---

## The Four Pillars

| Pillar | How MedVerify Addresses It |
|---|---|
| **AI Automation** | CV model + NLP pipeline automate verification end-to-end — no human in the AI loop |
| **Use of Data** | Trust Score combines CV signals, registry match, field completeness, and license status |
| **Squad APIs** | Payment initiation, virtual accounts, payouts, and webhooks all gated by verification |
| **Financial Innovation** | Adds a trust layer to healthcare payments before any money moves |

---

## ML Setup (Local)

### Prerequisites
- Python 3.9+
- Tesseract OCR ([Windows](https://github.com/UB-Mannheim/tesseract/wiki) | Linux: `sudo apt install tesseract-ocr` | Mac: `brew install tesseract`)

### Installation
```bash
cd ML
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### Run Order
```bash
# 1. Generate mock MDCN registry
python generate_registry.py

# 2. Generate synthetic credential dataset
python generate_dataset.py

# 3. Train the CV model (takes 5–10 mins)
python cv_pipeline.py

# 4. Start the API server
uvicorn api:app --reload --port 8000
```

---

## The Team

| Name | Role | Responsibilities |
|---|---|---|
| **Adekunle Balqees Kofoworola** | ML Engineer | CV pipeline · NLP extractor · Trust scoring · Fraud alert system · FastAPI |
| **Ajiboye Peter** | Backend Developer | Squad API integration · REST API · Database · Webhook logic |
| **Nosirat Alade** | Frontend Developer | Credential upload form · Trust score dashboard · UI/UX |
| **Oluwatimilehin Okusanya** | Frontend Developer | Admin fraud review panel · Fraud alert UI · ML API integration |

---

## Research & Validation

- **MDCN** — Repeatedly issued public warnings about unregistered practitioners on Nigerian digital health platforms
- **Nigeria Health Watch (2023)** — Documented fake doctors operating telemedicine services, patients receiving dangerous advice
- **WHO Digital Health Report** — Credential fraud is a top-3 barrier to digital health trust across Sub-Saharan Africa
- **Market Research** — No Nigerian telemedicine platform currently gates Squad or any payment API on real-time credential verification

---

*Built for Squad Hackathon 3.0 — Smart Systems: The Intelligent Economy*
