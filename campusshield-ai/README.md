<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1SH1DL4Xd1dmxP29b0TZDJ1XbW57UMTFK

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Email/Phone OTP Verification (works on Chrome + Android via USB)

CampusShield now supports **real OTP verification** for:
- Email (via SMTP)
- Phone (via Twilio Verify, optional)

### Start the verification server

1. Open a new terminal:
   ```
   cd server
   npm install
   # copy env template
   copy .env.example .env
   # edit .env with your SMTP (and optionally Twilio) credentials
   npm start
   ```

2. Frontend should point to the server (default is ok):
- `VITE_API_BASE=http://localhost:8080` (see `.env.example`)

### Android over USB (so your phone can reach localhost)

If you run the web app on your phone via Chrome using your PC's dev server, reverse both ports:

```
adb reverse tcp:5173 tcp:5173
adb reverse tcp:8080 tcp:8080
```

Then open on phone:
- `http://localhost:5173`

If `adb` isn't found on Windows, run it via:
- `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`

## Notifications + “running in background” indicator (Android)

CampusShield uses a **Service Worker** to show:
- a persistent “Guardian Protocol is active” status notification (best-effort)
- scam alert notifications when a suspicious message is intercepted (simulated)

To see notifications:
1. Open the app in Chrome (or install as a PWA)
2. Go to **Profile → Notifications → Enable**
3. Turn on Guardian (shield button)

> Note: A web app cannot read your SMS/WhatsApp directly. The app simulates message interception for demo purposes. To intercept real notifications/messages, you’d need a native Android build (NotificationListenerService), not plain web.

## Gemini API Key options

Option A (recommended for dev):
- Put your key in `.env.local` as `VITE_GEMINI_API_KEY=...`

Option B (no rebuild):
- Open **Profile → Gemini API Key** and paste the key (stored locally on that device).
