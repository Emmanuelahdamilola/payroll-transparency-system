# Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Stellar Account
- Groq API Key
- Domain name (optional)

---

## Option 1: Deploy to Render.com

### Step 1: Prepare Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/repo.git
git push -u origin main
```

### Step 2: Create Render Service
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: payroll-api
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter

### Step 3: Environment Variables
Add in Render Dashboard: