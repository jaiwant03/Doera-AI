# DOERA AI — Production Deployment Guide
## Architecture: React Frontend (Vercel) | Express Backend (Render) | Database (MongoDB Atlas) | Automation (External Self-Hosted n8n)

This guide provides complete, beginner-friendly, step-by-step instructions for deploying DOERA AI 3.0 to production.

---

### Architecture Overview

```
               ┌────────────────────────────────────────────────────────┐
               │                 USER BROWSER / CLIENT                  │
               └───────────────▲────────────────────────▲───────────────┘
                               │ HTTPS                  │ HTTPS / WSS
                               │                        │
               ┌───────────────▼──────────────┐  ┌──────▼───────────────────────┐
               │       VERCEL (Frontend)      │  │        RENDER (Backend)      │
               │  - React 18 + Vite SPA       │  │  - Express 4.21 + Node.js    │
               │  - Root Directory: frontend  │  │  - Root Directory: backend   │
               │  - Static CDN Edge Hosting   │  │  - Web Service (0.0.0.0:PORT)│
               │  - vercel.json SPA rewrites  │  │  - WebSocket Realtime Server │
               └──────────────────────────────┘  └──────┬───────────────────────┘
                                                        │
                         ┌──────────────────────────────┼──────────────────────────────┐
                         │ TLS (mongodb+srv://)         │ HTTPS Webhook                │ HTTPS OAuth
                         │                              │ (Outbound only)              │
               ┌─────────▼────────────────────┐  ┌──────▼───────────────────────┐  ┌───▼────────────────────────┐
               │     MONGODB ATLAS (Cloud)    │  │  EXTERNAL SELF-HOSTED n8n    │  │   GOOGLE CLOUD PLATFORM    │
               │  - Managed Cloud Replica Set │  │  - User-Hosted (VPS/Home)    │  │  - OAuth 2.0 Web Sign-In   │
               │  - IP Whitelist: 0.0.0.0/0   │  │  - NOT on Vercel or Render   │  │  - Gmail API (User Auth)   │
               │  - Users, Tasks, Evidence    │  │  - Public HTTPS Domain/Tunnel│  │  - Google Places API       │
               └──────────────────────────────┘  └──────────────────────────────┘  └────────────────────────────┘
```

---

### Critical Deployment Policies

1. **n8n Hosting Isolation**:
   - **DO NOT** deploy n8n to Vercel.
   - **DO NOT** deploy n8n to Render (neither as a Web Service nor as a Background Worker).
   - **DO NOT** create Dockerfiles or Docker Compose configurations for n8n in this repository.
   - n8n remains strictly self-hosted on your external server and is contacted solely via secure outbound HTTPS webhooks (`N8N_WEBHOOK_URL`).
2. **Protected Core Features**:
   - **Document Intelligence** (PDF, DOCX, TXT processing).
   - **Data Analytics & Visualization** (CSV, XLSX processing, Recharts, statistical engine).
   - **Local Service Research** (real location detection, OSM business discovery, haversine routing).
   - **Image Understanding** (direct question answering and visual grounding).
   All four features remain 100% intact with their existing logic and test suites.
3. **Storage Persistence**:
   - Render's disk is ephemeral on free/starter tiers. File uploads in `backend/uploads/` will be reset upon container restarts. For long-term production persistence of raw attachments, attach a Render Persistent Disk to `/opt/render/project/src/backend/uploads` or configure S3/Cloudinary. Processed document metadata and text are already permanently saved in MongoDB Atlas.

---

## Step A: GitHub Repository Preparation

1. **Verify your local git status**:
   Ensure all working files are clean and that sensitive `.env` files are not tracked.
   ```bash
   git status
   ```
2. **Ensure `.gitignore` is active**:
   The root `.gitignore`, `frontend/.gitignore`, and `backend/.gitignore` ensure that `.env` files, `node_modules/`, and uploaded files are never committed.
3. **Commit and Push to GitHub**:
   ```bash
   git add .
   git commit -m "chore: prepare DOERA AI for Vercel and Render production deployment"
   git push origin main
   ```

---

## Step B: Database Setup — MongoDB Atlas

1. **Create an Atlas Account & Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
   - Click **Create Deployment** $\to$ select the **M0 (Free)** tier.
   - Choose a cloud provider and region closest to your Render server (e.g., AWS / Frankfurt, Oregon, or Mumbai).
2. **Create a Database User**:
   - In Atlas, navigate to **Security** $\to$ **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Enter a username (e.g., `doera_admin`) and a secure password.
   - Set Database User Privileges: **Read and write to any database**.
   - Click **Add User**.
3. **Configure Network Access (IP Whitelist)**:
   - Navigate to **Security** $\to$ **Network Access**.
   - Click **Add IP Address**.
   - Select **Allow Access From Anywhere** (`0.0.0.0/0`).
   - *Note*: Render's outbound IP addresses are dynamic. Allowing `0.0.0.0/0` with strong user password authentication is the standard practice for Render-to-Atlas connectivity.
4. **Obtain Connection String**:
   - Go to **Database** $\to$ click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the SRV URI:
     `mongodb+srv://doera_admin:<password>@cluster0.xxxxx.mongodb.net/doera-ai?retryWrites=true&w=majority`
   - Replace `<password>` with your database user password and specify `doera-ai` as the database name.

---

## Step C: Backend Deployment — Render

1. **Create Web Service on Render**:
   - Log in to your [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** $\to$ **Web Service**.
   - Connect your GitHub repository (`DOERA-AI`).
2. **Configure Service Settings**:
   - **Name**: `doera-ai-backend` (or your chosen name)
   - **Region**: Choose a region close to your MongoDB Atlas cluster (e.g., Frankfurt or Oregon).
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js` (or `npm start`)
   - **Instance Type**: `Free` or `Starter`
3. **Configure Health Check Path**:
   - Expand **Advanced**.
   - Set **Health Check Path** to: `/health`
4. **Configure Backend Environment Variables on Render**:
   In the Render dashboard under **Environment**, add the following variables:

| Variable Key | Required | Value / Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Automatically supplied by Render (defaults to 10000 or 5000) |
| `FRONTEND_URL` | Yes | `https://your-frontend.vercel.app` (your Vercel app domain) |
| `CLIENT_URL` | Yes | `https://your-frontend.vercel.app` (alias for FRONTEND_URL) |
| `MONGODB_URI` | Yes | `mongodb+srv://doera_admin:<password>@cluster0.xxxxx.mongodb.net/doera-ai?retryWrites=true&w=majority` |
| `JWT_SECRET` | Yes | 32+ character random string (e.g., `openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Yes | 32-byte encryption key for integration credentials |
| `EMAIL_ENCRYPTION_KEY` | Yes | 32-byte encryption key for Gmail OAuth tokens |
| `LLM_PROVIDER` | No | `groq` (default) or `openai` |
| `GROQ_API_KEY` | Recommended | Your Groq API key for high-speed cloud LLaMA 3.3 70B |
| `GOOGLE_CLIENT_ID` | Optional | Your Google OAuth Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Your Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | Optional | `https://doera-ai-backend.onrender.com/api/integrations/google/callback` |
| `GOOGLE_CALLBACK_URL` | Optional | `https://doera-ai-backend.onrender.com/api/integrations/google/callback` |
| `GMAIL_OAUTH_REDIRECT_URI`| Optional | `https://doera-ai-backend.onrender.com/api/integrations/google/callback` |
| `GOOGLE_PLACES_API_KEY` | Optional | Google Places API key (enhances local business discovery) |
| `N8N_ENABLED` | Optional | `true` (if using external n8n) or `false` |
| `N8N_BASE_URL` | Optional | `https://n8n.yourdomain.com` (public HTTPS URL of your self-hosted n8n) |
| `N8N_WEBHOOK_URL` | Optional | `https://n8n.yourdomain.com/webhook/doera-actions` |

5. Click **Create Web Service**.
6. When deployment finishes, copy your Render service URL (e.g., `https://doera-ai-backend.onrender.com`).
7. Verify by opening `https://doera-ai-backend.onrender.com/health` in your browser. You should receive:
   ```json
   { "status": "healthy", "service": "DOERA AI Backend Execution Engine", "version": "3.0.0" }
   ```

---

## Step D: Frontend Deployment — Vercel

1. **Import Project to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/) and sign in.
   - Click **Add New...** $\to$ **Project**.
   - Select your GitHub repository (`DOERA-AI`).
2. **Configure Project Settings**:
   - **Framework Preset**: `Vite` (automatically detected).
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. **Configure Frontend Environment Variables on Vercel**:
   Under **Environment Variables**, add:

| Variable Key | Value / Example | Description |
|---|---|---|
| `VITE_API_URL` | `https://doera-ai-backend.onrender.com` | Your deployed Render backend HTTPS URL (no trailing slash) |
| `VITE_WS_URL` | `wss://doera-ai-backend.onrender.com` | Your Render WebSocket URL (optional; frontend auto-derives from VITE_API_URL if omitted) |
| `VITE_GOOGLE_CLIENT_ID` | `123456789-xxxx.apps.googleusercontent.com` | Google OAuth Web Client ID for One-Tap sign-in |

4. Click **Deploy**.
5. When the build completes, Vercel will assign a production URL (e.g., `https://doera-ai.vercel.app`).
6. **Update Render CORS**:
   - Go back to your Render Dashboard $\to$ Environment Variables.
   - Update `FRONTEND_URL` and `CLIENT_URL` with your exact Vercel URL (e.g., `https://doera-ai.vercel.app`).
   - Render will automatically re-deploy with updated CORS settings.

---

## Step E: External Self-Hosted n8n Configuration

### Why `localhost:5678` Does Not Work on Render
When your DOERA backend runs in Render's cloud environment, `localhost` refers to Render's cloud container, NOT your local computer. Therefore, configuring `http://localhost:5678` in production will result in connection timeouts.

### How to Connect Your Separately Self-Hosted n8n Instance
1. **Host n8n externally**:
   Run n8n on your own VPS (Ubuntu/Debian), home server, or local workstation.
2. **Expose n8n securely over HTTPS**:
   Use any of the following standard methods:
   - **Cloudflare Tunnel (Recommended & Free)**:
     ```bash
     cloudflared tunnel --url http://localhost:5678
     ```
     This provides a permanent HTTPS URL like `https://n8n.yourcustomdomain.com`.
   - **Reverse Proxy with SSL (Nginx / Caddy + Let's Encrypt)** on your VPS.
   - **ngrok** (for development/testing):
     ```bash
     ngrok http 5678
     ```
3. **Configure Backend Environment Variables**:
   In Render Environment Variables, set:
   ```env
   N8N_ENABLED=true
   N8N_BASE_URL=https://n8n.yourcustomdomain.com
   N8N_WEBHOOK_URL=https://n8n.yourcustomdomain.com/webhook/doera-actions
   ```
4. **Bi-directional Webhook Callbacks**:
   If your n8n workflow sends status callbacks back to DOERA AI, configure n8n's HTTP Request node to POST to:
   `https://doera-ai-backend.onrender.com/api/webhooks/n8n/callback`
   Payload:
   ```json
   {
     "taskId": "task-uuid",
     "executionId": "n8n-exec-uuid",
     "status": "COMPLETED",
     "outputData": { "result": "Workflow completed successfully" }
   }
   ```
5. **Safe Fallback**:
   If your self-hosted n8n instance is offline or unreachable, DOERA AI automatically logs a warning and falls back safely to direct Node.js execution without crashing or creating duplicate actions.

---

## Step F: Google OAuth & Gmail Integration Configuration

1. **Open Google Cloud Console**:
   Go to [Google Cloud Console](https://console.cloud.google.com/) $\to$ **APIs & Services** $\to$ **Credentials**.
2. **Configure OAuth Consent Screen**:
   - User Type: **External**.
   - App Name: `DOERA AI`.
   - Support email: your email.
   - Scopes:
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `https://www.googleapis.com/auth/gmail.send` (required for Gmail sending)
3. **Create OAuth 2.0 Web Client ID**:
   - Application type: **Web application**.
   - Name: `DOERA AI Web Client`.
   - **Authorized JavaScript origins**:
     - `https://your-frontend.vercel.app`
     - `http://localhost:5173` (for local development)
   - **Authorized redirect URIs**:
     - `https://doera-ai-backend.onrender.com/api/integrations/google/callback`
     - `https://doera-ai-backend.onrender.com/auth/google/callback`
     - `http://localhost:5000/api/integrations/google/callback` (for local dev)
4. **Copy Credentials to Render and Vercel**:
   - Copy **Client ID** $\to$ add to Vercel as `VITE_GOOGLE_CLIENT_ID`, and to Render as `GOOGLE_CLIENT_ID`.
   - Copy **Client Secret** $\to$ add to Render as `GOOGLE_CLIENT_SECRET`.

---

## Step G: Verification & Sanity Checklist

After completing deployment, verify each of the following:

- [ ] **Health Endpoint**: `https://your-backend.onrender.com/health` returns HTTP 200 OK.
- [ ] **Frontend Loading**: `https://your-frontend.vercel.app` loads the DOERA AI homepage.
- [ ] **React Router Refresh**: Navigating to `/login` or `/chat` and pressing browser Refresh ($F5$) reloads without a 404 error (handled by `vercel.json`).
- [ ] **Manual Authentication**: Registering a new account with email/password works and transitions to the workspace.
- [ ] **Google Sign-In**: Clicking Google Sign-In authenticates and logs in with proper token issuance.
- [ ] **Document Intelligence**: Uploading a PDF or TXT file processes content and displays summaries and key extractions.
- [ ] **Data Analytics**: Uploading a CSV or XLSX file renders tabular summaries and interactive Recharts charts.
- [ ] **Local Service Research**: Typing `find 5 laptop service centers near me` detects location coordinates and renders verified OpenStreetMap business cards and geographic map.
- [ ] **Image Understanding**: Uploading an image and asking questions (e.g. `What is this image about?`) returns a direct, question-specific visual explanation.
- [ ] **Gmail Multi-User Security**: Users cannot send emails without explicitly authenticating their own Gmail in Settings $\to$ Integrations.

---

## Step H: Troubleshooting Common Production Issues

### 1. CORS Error in Browser Console
- **Symptom**: `Access to fetch at 'https://...onrender.com/api/...' from origin 'https://...vercel.app' has been blocked by CORS policy`.
- **Fix**: Check `FRONTEND_URL` on Render. Ensure it matches your Vercel domain exactly (e.g., `https://your-app.vercel.app`) without trailing slashes. All `*.vercel.app` domains are automatically whitelisted.

### 2. Vercel Returns 404 on Page Refresh
- **Symptom**: Navigating to `https://your-app.vercel.app/chat` and refreshing shows Vercel 404 NOT_FOUND.
- **Fix**: Verify that `frontend/vercel.json` exists in the `frontend` folder containing the rewrite rule:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```

### 3. MongoDB Atlas Connection Timeout
- **Symptom**: Backend logs show `[DOERA DB] Error connecting to MongoDB: connection timed out`.
- **Fix**: In MongoDB Atlas, go to **Network Access** and verify that IP `0.0.0.0/0` is active. Check that the password in `MONGODB_URI` does not contain unencoded special characters (e.g. `@`, `#`, `%` must be URL-encoded).

### 4. Render Free Tier Cold Start Delay
- **Symptom**: Initial request takes 30-50 seconds to respond after inactivity.
- **Explanation**: Render's free instances spin down after 15 minutes of inactivity. Once spun up, subsequent requests respond in milliseconds. Upgrading to Render Starter eliminates spin-downs.

### 5. WebSocket Disconnection on Cloud
- **Symptom**: WebSocket closes with code 1006.
- **Fix**: DOERA's built-in frontend `websocket.js` client automatically schedules exponential backoff reconnection up to 10 attempts. Ensure `VITE_WS_URL` is set to `wss://your-backend.onrender.com` (using `wss://`, not `ws://`).
