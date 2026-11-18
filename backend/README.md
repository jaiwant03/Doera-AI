# DOERA AI — Backend Execution Engine

Production-grade Node.js, Express, LangGraph, and MongoDB execution engine powering **DOERA AI**: an autonomous real-world task assistant.

"Don't just ask AI. Let AI get it done."

---

## 1. Agentic Architecture (LangGraph)

Coordinated using `@langchain/langgraph` state graphs with human-in-the-loop checkpoints:

1. **Orchestrator Agent** (`orchestratorAgent.js`): Understands user requests, categorizes tasks (`LOCAL_SERVICE`, `REPAIR`, `DONATION`, `COMPLAINT`, `EDUCATION`), determines required toolsets, and establishes execution plans.
2. **Discovery Agent** (`discoveryAgent.js`): Discovers legitimate service providers, addresses, ratings, and phone numbers via Google Places API and OpenStreetMap Nominatim/Overpass live API fallback.
3. **Communication Agent** (`communicationAgent.js`): Formulates professional outreach, prepares drafts, checks human approval gates, and dispatches via Gmail OAuth2 or WhatsApp Business Cloud API.
4. **Quotation Agent** (`quotationAgent.js`): Normalizes pricing, compares provider rate cards, and computes inspection and hourly fees without fabricating values.
5. **Scheduling Agent** (`schedulingAgent.js`): Intersects calendar free/busy slots with provider availability, locks appointment windows, and generates booking reference IDs.
6. **Verification Agent** (`verificationAgent.js`): Performs evidence validation, verifies delivery statuses, and compiles structured completion reports.
7. **Recovery Agent** (`recoveryAgent.js`): Diagnoses transient API faults, activates secondary provider failover, and enforces maximum retry limits.

---

## 2. Real-World Integrations

- **Local Business Discovery**: Dual engine (Google Places + OpenStreetMap Overpass).
- **Email**: Gmail API OAuth 2.0 with AES-256-GCM token encryption and Nodemailer transport.
- **WhatsApp**: Official Meta WhatsApp Business Cloud API v21.0.
- **Calendar**: Google Calendar API OAuth 2.0 with free/busy conflict checking.
- **Browser Automation**: Playwright headless browser for public website extraction.
- **Automation Engine**: Bidirectional webhook integration with optional independent n8n runtime (bypassed when `ENABLE_N8N=false`).

---

## 3. Standalone Backend Deployment

The backend is completely decoupled and can be deployed directly to **Render**, **Railway**, or any Node.js host without running n8n:

1. **Build Command**: `npm install`
2. **Start Command**: `npm start`
3. **Environment**: Configure MongoDB Atlas URI in `MONGODB_URI` and JWT secret in `JWT_SECRET`. Leave `ENABLE_N8N=false`.

1. `User`: Authentication, roles, and safety authorization preferences.
2. `Conversation`: Thread management and metadata.
3. `Message`: User and AI message history.
4. `Task`: Full task lifecycle states (`RECEIVED` → `UNDERSTANDING` → `PLANNING` → `AWAITING_APPROVAL` → `EXECUTING` → `VERIFYING` → `COMPLETED` / `PARTIALLY_COMPLETED` / `FAILED` / `CANCELLED`).
5. `AgentExecution`: Granular latency, input, and output traces for each agent invocation.
6. `TaskEvent`: Chronological timeline events for live frontend streaming and auditing.
7. `ExternalContact`: Discovered real businesses, verified contact info, and status.
8. `Integration`: Encrypted OAuth tokens and external connection settings.
9. `Approval`: Human-in-the-loop authorization records.
10. `Notification`: Alerts emitted to the user.

---

## 4. API Reference

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Authenticate and receive JWT
- `POST /api/auth/logout` — End session
- `GET /api/auth/me` — Current user profile

### Chat & Messaging
- `POST /api/chat/message` — Send message and launch background task
- `GET /api/chat/conversations` — List conversation threads
- `GET /api/chat/conversations/:id` — Get conversation details and messages
- `DELETE /api/chat/conversations/:id` — Delete conversation

### Tasks & Execution
- `GET /api/tasks` — List active and historical tasks
- `GET /api/tasks/:id` — Get single task state
- `POST /api/tasks/:id/approve` — Approve pending human authorization gate
- `POST /api/tasks/:id/reject` — Reject proposed external action
- `POST /api/tasks/:id/cancel` — Cancel running execution
- `POST /api/tasks/:id/resume` — Resume interrupted task
- `GET /api/tasks/:id/events` — Retrieve event timeline

### Webhooks
- `POST /api/webhooks/n8n` — Receive updates from n8n workflows
- `POST /api/webhooks/gmail` — Receive Gmail push notifications
- `GET/POST /api/webhooks/whatsapp` — Meta Cloud API verification & message receiver

### Integrations
- `GET /api/integrations` — View connected status of external services
- `POST /api/integrations/gmail/connect` — Store encrypted Gmail OAuth credentials
- `POST /api/integrations/google-calendar/connect` — Store encrypted Calendar OAuth credentials

---

## 5. Automated Tests

Run the complete test suite:

```bash
npm test
```
