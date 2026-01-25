import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked"));
  },
  credentials: true,
}));

// ----- In-memory OTP store (dev/demo). For production use Redis.
const OTP_TTL_MS = 5 * 60 * 1000; // 5 mins
const otpStore = new Map(); // key -> { code, exp }

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function putOtp(key, code) {
  otpStore.set(key, { code, exp: Date.now() + OTP_TTL_MS });
}

function verifyOtp(key, code) {
  const rec = otpStore.get(key);
  if (!rec) return { ok: false, message: "OTP not found" };
  if (Date.now() > rec.exp) {
    otpStore.delete(key);
    return { ok: false, message: "OTP expired" };
  }
  if (String(code || "").trim() !== String(rec.code)) return { ok: false, message: "Invalid OTP" };
  otpStore.delete(key);
  return { ok: true };
}

// ----- Email sender (SMTP) -----
function makeMailer() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const mailer = makeMailer();

async function sendEmailOtp(email, code) {
  if (!mailer) return { sent: false };
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = "CampusShield verification code";
  const text = `Your CampusShield OTP is: ${code}\n\nThis code expires in 5 minutes.`;
  await mailer.sendMail({ from, to: email, subject, text });
  return { sent: true };
}

// ----- Twilio Verify (optional) -----
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
const twilioClient = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normPhone(phone) {
  return String(phone || "").trim();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- EMAIL OTP ---
app.post("/auth/email/send-otp", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, message: "Invalid email" });

  const code = genOtp();
  putOtp(`email:${email}`, code);

  try {
    const out = await sendEmailOtp(email, code);
    const devReturn = String(process.env.DEV_RETURN_OTP || "true").toLowerCase() === "true";
    if (!out.sent && devReturn) {
      console.log(`[DEV] Email OTP for ${email}: ${code}`);
      return res.json({ ok: true, devOtp: code, message: "SMTP not configured — returning dev OTP." });
    }
    return res.json({ ok: true, message: out.sent ? "OTP sent" : "SMTP not configured" });
  } catch (e) {
    console.error("Email send failed", e);
    return res.status(500).json({ ok: false, message: "Failed to send email OTP" });
  }
});

app.post("/auth/email/verify-otp", (req, res) => {
  const email = String(req.body?.email || "").trim();
  const otp = String(req.body?.otp || "").trim();
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, message: "Invalid email" });
  if (!otp) return res.status(400).json({ ok: false, message: "Missing OTP" });
  const out = verifyOtp(`email:${email}`, otp);
  if (!out.ok) return res.status(400).json(out);
  return res.json({ ok: true });
});

// --- PHONE OTP ---
app.post("/auth/phone/send-otp", async (req, res) => {
  const phone = normPhone(req.body?.phone);
  if (!phone) return res.status(400).json({ ok: false, message: "Invalid phone" });

  // Preferred: Twilio Verify
  if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
    try {
      await twilioClient.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
        .verifications
        .create({ to: phone, channel: "sms" });
      return res.json({ ok: true, message: "OTP sent" });
    } catch (e) {
      console.error("Twilio send failed", e);
      return res.status(500).json({ ok: false, message: "Twilio send failed" });
    }
  }

  // Fallback: dev OTP (no SMS provider configured)
  const code = genOtp();
  putOtp(`phone:${phone}`, code);
  const devReturn = String(process.env.DEV_RETURN_OTP || "true").toLowerCase() === "true";
  console.log(`[DEV] Phone OTP for ${phone}: ${code}`);
  return res.json({ ok: true, devOtp: devReturn ? code : undefined, message: "Twilio not configured — returning dev OTP." });
});

app.post("/auth/phone/verify-otp", async (req, res) => {
  const phone = normPhone(req.body?.phone);
  const otp = String(req.body?.otp || "").trim();
  if (!phone) return res.status(400).json({ ok: false, message: "Invalid phone" });
  if (!otp) return res.status(400).json({ ok: false, message: "Missing OTP" });

  if (twilioClient && TWILIO_VERIFY_SERVICE_SID) {
    try {
      const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks
        .create({ to: phone, code: otp });
      if (check?.status === "approved") return res.json({ ok: true });
      return res.status(400).json({ ok: false, message: "Invalid OTP" });
    } catch (e) {
      console.error("Twilio verify failed", e);
      return res.status(500).json({ ok: false, message: "Twilio verify failed" });
    }
  }

  const out = verifyOtp(`phone:${phone}`, otp);
  if (!out.ok) return res.status(400).json(out);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`CampusShield verification server listening on http://localhost:${PORT}`);
  if (!mailer) console.log("SMTP not configured. Email OTP will be returned as devOtp if DEV_RETURN_OTP=true.");
  if (!twilioClient) console.log("Twilio not configured. Phone OTP will be returned as devOtp if DEV_RETURN_OTP=true.");
});
