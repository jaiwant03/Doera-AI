# DOERA AI — External Credentials Guide (Optional)

All integrations in DOERA AI can run with mock credentials in development mode or with real production credentials when provided.

---

## 1. Google Places (Discovery Agent)
- **Variable**: `GOOGLE_PLACES_API_KEY`
- **Fallback**: Automatically falls back to **OpenStreetMap Nominatim & Overpass API** with zero credentials required.

---

## 2. Email Service (Communication Agent)
- **SMTP**: Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `backend/.env`.
- **OAuth2**: Supports Gmail OAuth2 via `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.
- **Fallback**: Development mode logs outbound emails directly to the server console and persists dispatch events to MongoDB.

---

## 3. WhatsApp Service (Communication Agent)
- **Variables**: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`.
- **API**: Meta Cloud API v21.0.
- **Fallback**: Safe dry-run mode when tokens are absent.

---

## 4. Google Calendar (Scheduling Agent)
- **Variables**: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`.
- **Fallback**: Returns structured booking reference codes and records schedule events to MongoDB.
