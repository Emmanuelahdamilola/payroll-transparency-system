# Payroll Transparency System (Blockchain + AI)

A secure, blockchain-powered payroll system designed to reduce ghost workers in Ekiti State. Staff are registered on-chain using hashed identities, payroll batches are verified, and anomalies are detected using AI. The system ensures transparency, auditability, and government-grade security.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Architecture Diagram](#architecture-diagram)
4. [Technology Stack](#technology-stack)
5. [Setup & Deployment](#setup--deployment)
6. [Environment Variables](#environment-variables)
7. [Running Tests](#running-tests)
8. [Team Roles & Responsibilities](#team-roles--responsibilities)
9. [Contributing](#contributing)

---

## Project Overview

This system allows Ekiti State Ministry of Finance to:

* Register staff on blockchain (`staffHash`)
* Upload payroll batches (CSV) and verify them
* Detect anomalies using AI (duplicate identities, ghost workers, salary discrepancies)
* Provide auditors with a dashboard to review flags and generate audit reports
* Keep sensitive PII off-chain (encrypted in MongoDB) while storing immutable proofs on Stellar

---

## Features

### Admin Dashboard

* Staff registration & management
* Payroll batch upload
* AI-powered verification
* Blockchain transaction tracking

### Auditor Dashboard

* Review flagged anomalies
* Approve/reject flags
* Generate audit reports with blockchain proofs

---

## Architecture Diagram

```
 +-------------------+       +-------------------+       +---------------------+
 |   Frontend (React) | <---> |   Backend (Node.js)| <---> |   Database (MongoDB)|
 +-------------------+       +-------------------+       +---------------------+
          |                             |
          |                             v
          |                     +-------------------+
          |                     |   Stellar Blockchain|
          |                     +-------------------+
          |                             ^
          +-----------------------------+
          | Blockchain writes: staffHash, batchHash, txID
          | AI anomaly detection results are stored in MongoDB
```

* Frontend interacts via REST API with backend
* Backend encrypts PII, computes hashes, stores proofs on Stellar
* AI module runs anomaly detection and generates explanations
* All blockchain transactions are recorded immutably on Stellar

---

## Technology Stack

* **Frontend**: React, TailwindCSS
* **Backend**: Node.js, Express.js
* **Database**: MongoDB
* **Blockchain**: Stellar (Soroban smart contracts)
* **AI**: Python / Node.js (Isolation Forest, fuzzy matching)
* **Auth**: JWT with role-based access (Admin, Auditor)

---

## Setup & Deployment

### 1. Clone the repository

```bash
git clone https://github.com/Emmanuelahdamilola/payroll-transparency-system.git
cd payroll-transparency-system
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in required values:

```text
# Backend
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
STELLAR_NETWORK=<testnet|mainnet>
ADMIN_SECRET_KEY=<stellar-admin-secret-key>
CONTRACT_ID=<deployed-contract-id>
```

### 4. Deploy Stellar smart contract (Soroban)

```bash
# Using Soroban CLI
soroban contract deploy --wasm ./contracts/staff_registry.wasm --network testnet
```

Save the returned contract ID in `.env` as `CONTRACT_ID`.

### 5. Start the backend

```bash
cd backend
npm run dev
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend will be available on `http://localhost:3000`

---

## Running Tests

```bash
# Run backend & smart contract tests
cd backend
npm run test
```

Tests include:

* Staff registration and verification
* Payroll batch upload and hashing
* AI anomaly detection
* Blockchain transaction logging

---

## Team Roles & Responsibilities

| Role                     | Responsibilities                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Developer       | Build Admin & Auditor dashboards, integrate API calls, display blockchain proofs and AI flags, make UI responsive.                                        |
| Backend Developer        | Create API endpoints, handle encryption & hashing of PII, integrate Stellar smart contracts, manage payroll batch uploads, implement AI anomaly workflow. |
| Data/AI Analyst          | Design anomaly detection model, run AI verification on payroll data, generate explanations for flagged records, maintain performance metrics.             |
| Cybersecurity Specialist | Ensure secure PII storage, secure API & blockchain interaction, implement access controls, conduct security audits.                                       |

---

## Contributing

1. Fork the repository
2. Create a new branch (`feature/<name>`)
3. Make your changes
4. Submit a pull request

---

*This README provides a full guide for developers, auditors, and admins to understand, deploy, and operate the Payroll Transparency System.*
