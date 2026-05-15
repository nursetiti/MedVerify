# 🛡️ Practitioner Verification & Payout System

### *Secure Fintech Infrastructure with Integrated Machine Learning*

This backend service automates the lifecycle of professional practitioner verification. By combining **Squad’s Financial Infrastructure** with a **Machine Learning Inference Engine**, the system ensures that only verified, paid practitioners are onboarded and settled.

---

## 🏗️ System Architecture

The project follows a modular microservices-inspired architecture:

* **Fintech Layer:** Managed via Squad API for collections and payouts.
* **Verification Logic:** A Node.js/Express core handling business rules and HMAC security.
* **Intelligence Layer:** A dedicated ML service for automated credential validation and fraud detection.

---

## 🚀 Core Features

* **Dynamic Virtual Accounts:** Instant GTBank account generation for practitioner payments.
* **Cryptographic Webhook Security:** Robust **HMAC SHA512** signature validation using `rawBody` buffers to prevent spoofing and data tampering.
* **ML-Driven Validation:** Automated document analysis via an external ML service triggered post-payment.
* **Automated Payouts:** Instant settlement orchestration via Squad's payout corridors upon successful ML verification.
* **ACID Transactions:** Sequelize-managed database transactions ensuring no practitioner is verified without a confirmed payment.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL / MySQL (Sequelize ORM)
* **Security:** HMAC SHA512, JWT, Helmet.js
* **ML Bridge:** RESTful API / Axios (Inter-service communication)
* **DevOps:** Ngrok (Webhook tunneling), Dotenv

---

## 📡 Webhook & ML Integration Flow

The system implements a high-integrity "Check-then-Act" workflow:

1. **Ingestion:** Squad sends a `POST` request to `/api/v1/webhooks/squad`.
2. **Security Gate:** The system verifies the `x-squad-encrypted-body` header against a locally generated hash.
3. **Event Routing:** On `charge_successful`, the system triggers the **ML Inference Engine**.
4. **Inference:** The ML model analyzes the practitioner’s data; if the confidence score is valid, the backend proceeds.
5. **Finality:** The `squadService.executePayout` is called, and the database is updated.

---

## ⚙️ Setup & Installation

### 1. Environment Configuration

Create a `.env` file in the root directory:

```env
PORT=5000
SQUAD_SECRET_KEY=sandbox_sk_xxxxxxx 
ML_SERVICE_URL=http://localhost:8000/api/v1/verify
DB_NAME=practitioner_db

```

### 2. Installation

```bash
npm install
npx sequelize-cli db:migrate
npm run dev

```

### 3. Webhook Tunneling

To receive live notifications from Squad in your local environment:

```bash
ngrok http 5000

```

Update your Squad Dashboard with the resulting URL: `https://your-ngrok-id.ngrok-free.dev/api/v1/webhooks/squad`.

---

## 🔒 Security Implementation Notes

* **Raw Buffer Verification:** We intercept the raw request stream to ensure the HMAC signature is calculated on the exact data sent by Squad, avoiding `JSON.parse` whitespace discrepancies.
* **Idempotency:** The system checks for existing transaction references to prevent duplicate payouts from retried webhook events.

---

## 👨‍💻 Author

**Ajiboye Peter** *300L Computer Science Student, University of Lagos* *Certified Network Technician (Cisco)* *Backend Developer & Aspiring Penetration Tester*

---