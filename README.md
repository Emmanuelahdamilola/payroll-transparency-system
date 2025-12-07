# 🏛️ Blockchain Payroll Transparency System

> A secure, transparent payroll management system leveraging blockchain technology to combat ghost workers, salary fraud, and corruption in government payroll systems.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-purple.svg)](https://stellar.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Usage Guide](#usage-guide)
- [Security Features](#security-features)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The Blockchain Payroll Transparency System is a comprehensive solution designed to eliminate payroll fraud in government institutions. By combining cryptographic hashing, blockchain immutability, and AI-powered anomaly detection, the system ensures:

- **Zero Ghost Workers**: Every staff member is verified on blockchain before receiving payment
- **Salary Anomaly Detection**: AI algorithms flag unusual salary amounts automatically
- **Complete Audit Trail**: Immutable records of all payroll transactions
- **Privacy Protection**: Staff PII is encrypted; only cryptographic hashes are exposed
- **Real-time Monitoring**: Auditors can review flags and anomalies instantly

### 🌍 Use Case

Built specifically for Nigerian government ministries, departments, and agencies (MDAs) to combat the estimated ₦2.1 billion monthly loss to ghost workers and payroll fraud.

---

## ✨ Key Features

### 🔐 Security & Privacy
- **End-to-End Encryption**: All personally identifiable information (PII) encrypted using AES-256
- **Cryptographic Hashing**: SHA-256 hashing for staff identifiers
- **Blockchain Verification**: Staff registration recorded on Stellar blockchain
- **Role-Based Access Control**: Admin, Auditor, and Super Admin roles with granular permissions
- **HTTP-Only Cookies**: Secure authentication with JWT tokens

### 🤖 AI-Powered Detection
- **Ghost Worker Detection**: Identifies staff not in verified registry (100% accuracy)
- **Duplicate Detection**: Finds duplicate BVN/NIN entries and fuzzy name matches (>80% similarity)
- **Salary Anomaly Detection**: Statistical analysis flags salaries outside expected ranges
- **AI Explanations**: Natural language explanations powered by Groq AI

### 📊 Comprehensive Dashboards
- **Admin Dashboard**: Staff management, payroll upload, system statistics
- **Auditor Dashboard**: Flag review, anomaly analysis, report generation
- **Blockchain Explorer**: Real-time transaction viewer with block details

### 📄 Audit & Reporting
- **PDF Reports**: Professional audit reports with blockchain proof
- **JSON Exports**: Machine-readable data for integration
- **Flag Management**: Review, approve, or reject anomalies with notes
- **Audit Trail**: Complete history of all actions and decisions

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  (Next.js/React - Separate Repository)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST API
┌──────────────────────▼──────────────────────────────────────┐
│                     BACKEND (This Repo)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Express.js API Server                              │   │
│  │  ├─ Authentication (JWT)                            │   │
│  │  ├─ Authorization (Role-Based)                      │   │
│  │  └─ Rate Limiting & Security                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Business Logic Layer                               │   │
│  │  ├─ Staff Management                                │   │
│  │  ├─ Payroll Processing                              │   │
│  │  ├─ AI Detection Engine                             │   │
│  │  └─ Blockchain Integration                          │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────┬──────────────────┬──────────────────┬───────────┘
           │                  │                  │
┌──────────▼─────────┐ ┌─────▼──────────┐ ┌────▼──────────┐
│   MongoDB          │ │ Stellar        │ │ Groq AI       │
│   (Database)       │ │ (Blockchain)   │ │ (LLM)         │
│                    │ │                │ │               │
│ • Users            │ │ • Staff Reg    │ │ • Explanations│
│ • Staff (Encrypted)│ │ • Payroll Hash │ │ • Summaries   │
│ • Payroll Batches  │ │ • Immutable    │ │               │
│ • Flags            │ │   Records      │ │               │
└────────────────────┘ └────────────────┘ └───────────────┘
```

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Language**: TypeScript 5.0+
- **Database**: MongoDB 6.0+
- **ODM**: Mongoose 8.0+

### Blockchain
- **Network**: Stellar (Testnet/Mainnet)
- **Smart Contracts**: Soroban
- **SDK**: @stellar/stellar-sdk 12.0+

### AI & ML
- **LLM**: Groq (LLaMA 3.1)
- **Detection**: Custom algorithms
- **Similarity**: string-similarity

### Security
- **Encryption**: AES-256 (crypto-js)
- **Hashing**: SHA-256
- **Authentication**: JWT (jsonwebtoken)
- **Password**: bcryptjs

### DevOps
- **Hosting**: Render.com (Backend), Vercel (Frontend)
- **Environment**: dotenv
- **Process Management**: PM2 (production)

---

## 📦 Installation

### Prerequisites

```bash
# Required
- Node.js 18+ and npm/yarn
- MongoDB 6.0+ (local or Atlas)
- Stellar account (Testnet/Mainnet)
- Groq API key

# Optional
- Docker & Docker Compose
- Git
```

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/payroll-transparency-backend.git
cd payroll-transparency-backend
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Environment Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section).

### Step 4: Database Setup

```bash
# If using local MongoDB
mongod --dbpath=/path/to/data

# If using MongoDB Atlas, update MONGODB_URI in .env
```

### Step 5: Run Development Server

```bash
npm run dev
# or
yarn dev

# Server starts at http://localhost:5000
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=development
PORT=5000

# ============================================
# DATABASE
# ============================================
MONGODB_URI=mongodb://localhost:27017/payroll-transparency
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/payroll-transparency

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# ============================================
# ENCRYPTION
# ============================================
# Must be exactly 32 characters for AES-256
ENCRYPTION_KEY=12345678901234567890123456789012

# ============================================
# STELLAR BLOCKCHAIN
# ============================================
STELLAR_NETWORK=TESTNET
# Options: TESTNET, FUTURENET, MAINNET

STELLAR_RPC_URL=https://soroban-testnet.stellar.org
# Testnet: https://soroban-testnet.stellar.org
# Futurenet: https://rpc-futurenet.stellar.org
# Mainnet: https://soroban-rpc.mainnet.stellar.gateway.fm

STELLAR_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Your Stellar secret key (starts with S)

SOROBAN_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Your deployed Soroban contract ID (starts with C)

# ============================================
# AI / LLM
# ============================================
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Get from: https://console.groq.com/

# ============================================
# CORS (Frontend URLs)
# ============================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend.vercel.app

# ============================================
# FILE UPLOAD
# ============================================
MAX_FILE_SIZE=10485760
# 10MB in bytes

UPLOAD_DIR=./uploads
```

### Production Environment Variables (Render.com)

Add these in Render Dashboard → Environment:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production-secret-key
ENCRYPTION_KEY=32-character-production-key
STELLAR_NETWORK=MAINNET
STELLAR_SECRET_KEY=your-mainnet-secret
SOROBAN_CONTRACT_ID=your-mainnet-contract
GROQ_API_KEY=your-groq-key
```

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:5000/api
Production: https://your-api.onrender.com/api
```

### Authentication

All protected endpoints require JWT authentication via HTTP-only cookie.

**Login to get cookie:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response sets cookie automatically**

---

### API Endpoints Overview

#### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login user |
| POST | `/logout` | Public | Logout user |
| GET | `/profile` | Protected | Get current user |
| PUT | `/update-profile` | Protected | Update profile |
| POST | `/create-auditor` | Admin | Create auditor account |
| GET | `/users` | Admin | List all users |
| PATCH | `/users/:id/status` | Admin | Toggle user status |

#### 👥 Staff Management (`/api/staff`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Admin | Register new staff |
| GET | `/` | Protected | List all staff |
| GET | `/stats` | Protected | Staff statistics |
| GET | `/:staffHash` | Protected | Get staff by hash |
| PUT | `/:id` | Admin | Update staff |
| PATCH | `/:id/status` | Admin | Activate/deactivate |

#### 💰 Payroll Management (`/api/payroll`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/upload` | Admin | Upload CSV |
| GET | `/` | Protected | List batches |
| GET | `/:id` | Protected | Get batch details |
| GET | `/:id/records` | Protected | Get batch records |
| GET | `/:id/flags` | Protected | Get batch flags |

#### 🚩 Flag Management (`/api/flags`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Protected | List all flags |
| GET | `/stats` | Protected | Flag statistics |
| GET | `/analyze` | Protected | AI analysis |
| GET | `/:id` | Protected | Get flag details |
| PATCH | `/:id/review` | Protected | Review flag |

#### 📊 Dashboard (`/api/dashboard`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/admin-summary` | Admin | Admin dashboard |
| GET | `/auditor-summary` | Protected | Auditor dashboard |
| GET | `/system-stats` | Admin | System statistics |

#### ⛓️ Blockchain Explorer (`/api/blockchain`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/recent-tx` | Protected | Recent transactions |
| GET | `/logs` | Protected | Event logs |
| GET | `/tx/:hash` | Protected | Transaction details |
| GET | `/proof/staff/:hash` | Protected | Staff proof |
| GET | `/proof/batch/:id` | Protected | Batch proof |

#### 📄 Audit Reports (`/api/audit`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/report/:batchId` | Protected | Generate report (PDF/JSON) |
| GET | `/stats` | Protected | Audit statistics |

---

### Detailed API Examples

#### Example 1: Register Staff

```bash
POST /api/staff/register
Authorization: Cookie (set after login)
Content-Type: application/json

{
  "name": "Amina Bello",
  "dob": "1990-05-15",
  "bvn": "12345678901",
  "nin": "98765432109",
  "phone": "08012345678",
  "grade": "Grade Level 10",
  "department": "Finance"
}

# Response
{
  "success": true,
  "message": "Staff registered successfully on blockchain",
  "data": {
    "staffHash": "abc123def456...",
    "verified": true,
    "blockchainTxs": ["tx_hash_here"]
  }
}
```

#### Example 2: Upload Payroll CSV

```bash
POST /api/payroll/upload
Authorization: Cookie
Content-Type: multipart/form-data

# Form Data:
payroll: [CSV file]
month: 12
year: 2024

# CSV Format:
staffhash,salary
abc123def456...,250000
def789ghi012...,180000

# Response
{
  "success": true,
  "data": {
    "batchId": "batch_id_here",
    "flaggedCount": 3,
    "detectionSummary": {
      "ghostWorkers": 2,
      "duplicates": 1,
      "salaryAnomalies": 0
    }
  }
}
```

#### Example 3: Review Flag

```bash
PATCH /api/flags/flag_id_here/review
Authorization: Cookie
Content-Type: application/json

{
  "resolution": "confirmed",
  "notes": "Verified as ghost worker. No matching staff record found."
}

# Response
{
  "success": true,
  "message": "Flag reviewed successfully"
}
```

#### Example 4: Generate Audit Report

```bash
# PDF Report
GET /api/audit/report/batch_id_here?format=pdf
Authorization: Cookie

# Downloads PDF file

# JSON Report
GET /api/audit/report/batch_id_here?format=json
Authorization: Cookie

# Returns JSON with full report data
```

---

## 📖 Usage Guide

### For Administrators

#### 1. Initial Setup

```bash
# Register admin account
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ministry.gov.ng",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Admin",
    "role": "admin"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@ministry.gov.ng",
    "password": "SecurePassword123!"
  }'
```

#### 2. Register Staff

```bash
curl -X POST http://localhost:5000/api/staff/register \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Fatima Abdullahi",
    "dob": "1988-03-22",
    "bvn": "22345678901",
    "nin": "33345678901",
    "phone": "08098765432",
    "grade": "Grade Level 12",
    "department": "Human Resources"
  }'
```

#### 3. Upload Monthly Payroll

Create `payroll_december_2024.csv`:
```csv
staffhash,salary
abc123def456...,250000
def789ghi012...,180000
```

Upload:
```bash
curl -X POST http://localhost:5000/api/payroll/upload \
  -b cookies.txt \
  -F "payroll=@payroll_december_2024.csv" \
  -F "month=12" \
  -F "year=2024"
```

### For Auditors

#### 1. View Dashboard

```bash
curl http://localhost:5000/api/dashboard/auditor-summary \
  -b cookies.txt
```

#### 2. Review Flags

```bash
# Get all pending flags
curl http://localhost:5000/api/flags?status=pending \
  -b cookies.txt

# Review specific flag
curl -X PATCH http://localhost:5000/api/flags/FLAG_ID/review \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "resolution": "confirmed",
    "notes": "Confirmed ghost worker after investigation"
  }'
```

#### 3. Generate Report

```bash
# PDF Report
curl http://localhost:5000/api/audit/report/BATCH_ID?format=pdf \
  -b cookies.txt \
  -o audit_report.pdf

# JSON Report
curl http://localhost:5000/api/audit/report/BATCH_ID?format=json \
  -b cookies.txt > report.json
```

---

## 🔒 Security Features

### 1. Data Encryption

**PII Encryption (AES-256)**:
```typescript
// Names, DOB encrypted at rest
encrypt("John Doe") → "U2FsdGVkX1+abc123..."
```

**One-Way Hashing (SHA-256)**:
```typescript
// BVN, NIN, Phone hashed (irreversible)
hash("12345678901") → "abc123def456..."
```

**Deterministic Staff Hash**:
```typescript
// Unique identifier per staff
staffHash = SHA256(name + dob + bvn + nin)
```

### 2. Authentication & Authorization

**JWT Tokens**:
- HTTP-only cookies (XSS protection)
- 7-day expiration
- Secure flag (HTTPS only)
- SameSite=None (cross-origin)

**Role-Based Access**:
- Admin: Full access
- Auditor: Read + flag review
- Super Admin: System management

### 3. Rate Limiting

```typescript
// General API: 100 requests / 15 minutes
// Auth endpoints: 10 attempts / 15 minutes
```

### 4. Input Validation

- Email format validation
- Password strength requirements
- BVN/NIN format (11 digits)
- Date format (YYYY-MM-DD)
- CSV structure validation

### 5. Blockchain Immutability

- Staff registration recorded on-chain
- Payroll batch hashes stored
- Tamper-proof audit trail
- Public verification possible

---

## 🧪 Testing

### Unit Tests

```bash
npm run test
# or
yarn test
```

### Integration Tests

```bash
npm run test:integration
```

### API Testing with cURL

See `docs/API_TESTS.md` for comprehensive test scripts.

### Testing Scenarios

#### Scenario 1: Clean Payroll (No Issues)
```bash
# Upload clean CSV - expect 0 flags
```

#### Scenario 2: Ghost Workers
```bash
# Upload CSV with fake staffHash - expect ghost worker flags
```

#### Scenario 3: Salary Anomalies
```bash
# Upload CSV with out-of-range salaries - expect anomaly flags
```

#### Scenario 4: Duplicate Detection
```bash
# Register 2 staff with same BVN - expect duplicate flag
```

---

## 🚀 Deployment

### Deploy to Render.com (Recommended)

#### 1. Create Account
- Sign up at [render.com](https://render.com)
- Connect your GitHub repository

#### 2. Create Web Service
```
Service Type: Web Service
Name: payroll-transparency-api
Environment: Node
Build Command: npm install && npm run build
Start Command: npm start
```

#### 3. Add Environment Variables
Add all variables from `.env.example` in Render dashboard.

#### 4. Deploy
```bash
git push origin main
# Render auto-deploys on push
```

### Deploy with Docker

```bash
# Build image
docker build -t payroll-api .

# Run container
docker run -p 5000:5000 \
  --env-file .env \
  payroll-api
```

### Deploy with Docker Compose

```bash
docker-compose up -d
```

---

## 📂 Project Structure

```
payroll-transparency-backend/
├── src/
│   ├── config/
│   │   ├── database.ts           # MongoDB connection
│   │   ├── env.ts                # Environment config
│   │   └── upload.ts             # Multer config
│   ├── controllers/
│   │   ├── authController.ts     # Auth logic
│   │   ├── staffController.ts    # Staff CRUD
│   │   ├── payrollController.ts  # Payroll processing
│   │   ├── flagController.ts     # Flag management
│   │   ├── dashboardController.ts # Dashboard data
│   │   ├── blockchainController.ts # Blockchain explorer
│   │   └── auditController.ts    # Report generation
│   ├── middleware/
│   │   └── auth.ts               # JWT & RBAC
│   ├── models/
│   │   ├── User.ts               # User schema
│   │   ├── Staff.ts              # Staff schema
│   │   ├── PayrollBatch.ts       # Batch schema
│   │   └── Flag.ts               # Flag schema
│   ├── routes/
│   │   ├── authRoutes.ts         # Auth endpoints
│   │   ├── staffRoutes.ts        # Staff endpoints
│   │   ├── payrollRoutes.ts      # Payroll endpoints
│   │   ├── flagRoutes.ts         # Flag endpoints
│   │   ├── dashboardRoutes.ts    # Dashboard endpoints
│   │   ├── blockchainRoutes.ts   # Blockchain endpoints
│   │   └── auditRoutes.ts        # Audit endpoints
│   ├── services/
│   │   ├── aiDetectionService.ts # AI anomaly detection
│   │   ├── blockchainService.ts  # Stellar integration
│   │   └── groqService.ts        # AI explanations
│   ├── utils/
│   │   ├── auth.ts               # JWT utils
│   │   ├── encryption.ts         # AES encryption
│   │   └── hash.ts               # SHA-256 hashing
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── server.ts                 # Express app entry
├── uploads/                      # CSV uploads (gitignored)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── Dockerfile                    # Docker image
├── docker-compose.yml            # Docker compose
└── README.md                     # This file
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 👥 Team

- **Lead Developer**: Your Name
- **Blockchain Engineer**: Team Member
- **AI Engineer**: Team Member
- **Frontend Developer**: Team Member

---

## 📞 Support

- **Documentation**: [https://docs.your-project.com](https://docs.your-project.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/payroll-transparency-backend/issues)
- **Email**: support@your-project.com
- **Discord**: [Join our community](https://discord.gg/your-invite)

---

## 🙏 Acknowledgments

- Nigerian Federal Ministry of Finance for sponsoring this project
- Stellar Development Foundation for blockchain infrastructure
- Groq AI for language model API
- Open source community

---

## 📊 Project Status

- ✅ Core API Complete
- ✅ Blockchain Integration
- ✅ AI Detection Engine
- ✅ Dashboard Endpoints
- ✅ Audit Reports
- 🚧 Mobile App (In Progress)
- 📅 Advanced Analytics (Planned)

---

**Built with ❤️ for transparent governance in Nigeria** 🇳🇬