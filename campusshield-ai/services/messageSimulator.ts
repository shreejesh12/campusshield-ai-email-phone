export type SimulatedMessage = {
  channel: "WhatsApp" | "Telegram" | "SMS" | "Email" | "Browser";
  text: string;
};

const CHANNELS: SimulatedMessage["channel"][] = ["WhatsApp", "Telegram", "SMS", "Email", "Browser"];

const SAFE_MESSAGES = [
  "Hey, are we meeting at 3 PM in the library?",
  "Your class schedule is updated on the official portal.",
  "Project submission deadline is Monday. Please upload on Moodle.",
  "Thanks! I’ll call you in 10 mins.",
];

const SCAM_MESSAGES = [
  "URGENT: Your bank KYC is pending. Verify now: https://bit.ly/verify-kyc",
  "Congrats! You won a gift card. Claim here: http://tinyurl.com/free-prize",
  "You are selected for internship. Pay registration fee via UPI to confirm.",
  "Your account will be suspended in 30 minutes. Tap here to re-activate.",
  "University admin: share OTP to confirm your fee refund.",
];

export function getSimulatedMessage(): SimulatedMessage {
  const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
  const isScam = Math.random() < 0.35;
  const pool = isScam ? SCAM_MESSAGES : SAFE_MESSAGES;
  const text = pool[Math.floor(Math.random() * pool.length)];
  return { channel, text };
}

export function isProbablyScamSample(text: string): boolean {
  return /bit\.ly|tinyurl|kyc|otp|pay|fee|urgent|suspended|gift/i.test(text);
}
