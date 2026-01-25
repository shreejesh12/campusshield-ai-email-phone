import { ScanResult } from "../types";

/**
 * Fast, offline scam heuristic.
 * This is NOT perfect — it exists so the app still works even if Gemini is unreachable.
 */
export function heuristicAnalyze(content: string): ScanResult {
  const text = (content || "").toLowerCase();

  const hit = (re: RegExp) => re.test(text);
  const hits: string[] = [];

  // Common scam signals
  const patterns: Array<[string, RegExp, number]> = [
    ["Phishing Link", /(http|https):\/\//i, 25],
    ["URL Shortener", /(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly)/i, 20],
    ["Urgent Action Required", /(urgent|immediately|within\s*\d+\s*(min|minutes|hour|hours)|act\s*now|final\s*warning)/i, 15],
    ["OTP / Verification", /(otp|one\s*time\s*password|verify\s*your\s*(account|upi|bank)|kyc)/i, 20],
    ["Payment / Fee", /(pay\s*(now|immediately)|processing\s*fee|registration\s*fee|upi|scan\s*qr|send\s*money)/i, 20],
    ["Impersonation", /(dean|principal|admin|university|college\s*office|it\s*desk|bank\s*support)/i, 10],
    ["Prize / Gift", /(congratulations|winner|gift\s*card|free\s*iphone|prize|lottery)/i, 15],
    ["Fake Job/Internship", /(internship|job\s*offer|selected|hr\s*team|appointment\s*letter)/i, 10],
  ];

  let score = 0;
  for (const [name, re, add] of patterns) {
    if (hit(re)) {
      hits.push(name);
      score += add;
    }
  }

  // Extra nudges
  if (hit(/\b\d{10}\b/) && hit(/upi|pay|send/)) score += 10; // phone + pay
  if (hit(/password|pin|cvv/)) score += 25;
  if (hit(/click\s*here|tap\s*here/)) score += 8;

  score = Math.max(0, Math.min(100, score));
  const isScam = score >= 55;

  const recommendations = isScam
    ? [
        "Do not click links or share OTP/PIN.",
        "Verify the sender using an official website/number.",
        "If money was sent, contact your bank immediately.",
      ]
    : [
        "Still be cautious: never share OTP/PIN.",
        "If a link looks suspicious, verify with the official source.",
      ];

  const explanation = isScam
    ? "This message contains multiple scam signals (links / urgency / verification or payment requests)."
    : "I don't see strong scam signals, but stay cautious with links and personal information.";

  return {
    isScam,
    riskScore: score,
    explanation,
    recommendations,
    detectedPatterns: Array.from(new Set(hits)),
    scamType: isScam ? (hits[0] || "Suspicious") : "Low Risk",
  };
}
