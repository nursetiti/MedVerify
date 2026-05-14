# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
This README is designed to impress the judges. It doesn't just list features; it explains the **architectural "why"** behind your decisions, highlighting the **Security-First** approach and the seamless integration between **AI (Python)** and **Fintech (Node.js/Squad)**.

---

# 🏥 MedVerify: AI-Powered Practitioner Credentialing & Payouts

**MedVerify** is a "Security-First" fintech solution designed to automate the verification of medical practitioners and facilitate instant, secure payouts via the **Squad API**. By bridging Computer Vision and NLP with robust financial gates, we ensure that only verified professionals receive funds.

## 🏗️ System Architecture

MedVerify uses a high-performance micro-service architecture:

* **Primary Backend:** Node.js / Express (The Orchestrator)
* **Security Engine:** Python / FastAPI (CV & NLP Pipeline)
* **Database:** PostgreSQL with Sequelize ORM
* **Payment Gateway:** Squad (GTBank) Payout & Webhook API

---

## 🛡️ Key Security Features

### 1. The AI Trust Gate

Every document uploaded undergoes a dual-layer analysis:

* **Computer Vision (CV):** Detects digital tampering, Photoshop artifacts, and metadata inconsistencies.
* **NLP Pipeline:** Extracts license numbers and validates them against a secure medical registry.

### 2. Conditional Payout Logic

Payouts are never manual. The **Squad Payout API** is only triggered if the AI returns a `Trust Score >= 75`.

* **Score < 40:** Immediate account suspension and fraud logging.
* **Score 40-74:** Transaction flagged for manual human audit.

### 3. Real-time Webhook Synchronization

We don't "guess" if a payment worked. Our dedicated **Webhook Listener** processes asynchronous updates from Squad, moving transaction statuses from `PENDING` to `SUCCESS` only after bank confirmation.

---

## 🚀 Getting Started

### Prerequisites

* Node.js (v16+)
* Python (3.9+)
* PostgreSQL
* Squad Sandbox Secret Key

### Installation

1. **Clone the Repo**
```bash
git clone https://github.com/your-repo/medverify.git

```


2. **Backend Setup (Node.js)**
```bash
cd medverify-backend
npm install
cp .env.example .env
npm start

```


3. **ML Service Setup (Python)**
```bash
cd medverify-ml
pip install -r requirements.txt
python api.py

```



---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/auth/signup` | Register a new practitioner |
| `POST` | `/api/v1/auth/login` | Returns JWT and session data |

### Verification & Payout

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/verify/process` | **Protected.** Uploads ID, runs AI, and triggers Squad |

### Webhooks

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/webhooks/squad` | Listens for payout success/failure from Squad |

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express, Sequelize
* **ML Engine:** FastAPI, PyTorch, Tesseract OCR
* **Payments:** Squad Payout API
* **Infrastructure:** JWT for Auth, Multer for Binary Handling, Axios for Cross-Service Communication

---

**Built for the 2026 Squad Hackathon.**
*Protecting the integrity of medical disbursements through Intelligent Automation.*
