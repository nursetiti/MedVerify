# MedVerify Backend 🩺🛡️

**MedVerify** is a security-first backend infrastructure designed to authenticate medical practitioners by integrating with the **Squad API** and national medical registries. This project was built during the **HNG Internship** and focuses on scalable, modular, and secure verification workflows.

## 🚀 Features

* **Secure Authentication**: JWT-based auth with modular service-based logic.
* **Medical Verification**: Integration with **Squad API** for payment-triggered license verification.
* **Relational Data Modeling**: Structured PostgreSQL/MySQL management using Sequelize for high data integrity.
* **Security-First Architecture**: Implemented signature verification for webhooks and strict file upload validation.

---

## 🛠️ Tech Stack

* **Runtime**: Node.js (Express.js).
* **Database**: PostgreSQL / MySQL (Sequelize ORM).
* **Security**: Crypto (Hmac), JWT, Helmet.
* **Payments/Webhooks**: Squad API.

---

## 📁 Project Structure

```bash
├── config/             # Database & environment configurations
├── controllers/        # Logical handlers (Auth, Webhooks, Admin)
├── middleware/         # Security & File upload (Multer) logic
├── models/             # Database schemas (User, Verification, etc.)
├── routes/             # API endpoint definitions
├── services/           # External API integrations (Squad, Auth)
└── server.js           # Main application entry point

```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/nursetiti/MedVerify.git
cd MedVerify

```

### 2. Install Dependencies

Ensure you have Node.js installed. Run a clean installation to avoid dependency conflicts:

```bash
npm install

```

### 3. Environment Variables

Create a `.env` file in the root directory and add the following:

```env
PORT=5000
DB_NAME=medverify_db
DB_USER=your_user
DB_PASSWORD=your_password
DB_HOST=localhost
JWT_SECRET=your_jwt_secret
SQUAD_SECRET_KEY=your_squad_secret_key

```

### 4. Run the Server

```bash
# Development mode
npm run dev

# Production mode
node server.js

```

---

## 🔒 Security Implementation

As an **aspiring penetration tester**, I have prioritized the following security measures:

* **Webhook Validation**: All Squad API callbacks are verified using HMAC SHA-512 signatures to prevent spoofing.
* **Input Sanitization**: Strict validation of medical license formats and document uploads.
* **Role-Based Access Control (RBAC)**: Protected routes for admin and practitioner data via custom middleware.

---
## 👨‍💻 Author

**Ajiboye Peter**

*Backend Developer | Certified Network Technician | Cybersecurity Enthusiast*

[LinkedIn](https://www.google.com/search?q=https://www.linkedin.com/in/ajiboye-peter) | [Portfolio](https://www.google.com/search?q=%23)

---

**License**: Distributed under the MIT License. See `LICENSE` for more information.