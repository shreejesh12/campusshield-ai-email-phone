# CampusShield

AI-powered scam-detection PWA that helps students (and elderly users) spot fraudulent SMS, email and phone content before they act on it.

## How it works

- A heuristic engine scores message content for known scam patterns
- Google Gemini provides a second-layer AI analysis and plain-language explanation of why a message looks dangerous
- Persistent "guardian" notifications via a service worker (PWA)
- Optional real OTP verification server (email via SMTP, phone via Twilio)

> Demo note: a web app cannot read your real SMS/WhatsApp. Message interception is simulated; a native Android build would be needed for live interception.

## Tech stack

React, TypeScript, Tailwind, Firebase, Node/Express (verification server), Gemini API.

## Structure

Full app + docs live in [`campusshield-ai/`](campusshield-ai/README.md).
