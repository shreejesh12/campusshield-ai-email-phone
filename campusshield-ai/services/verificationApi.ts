type SendOtpResponse = { ok: boolean; message?: string; devOtp?: string };
type VerifyOtpResponse = { ok: boolean; message?: string };

const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string | undefined)?.trim() || "http://localhost:8080";

async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function sendEmailOtp(email: string): Promise<SendOtpResponse> {
  return await postJson<SendOtpResponse>("/auth/email/send-otp", { email });
}

export async function verifyEmailOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
  return await postJson<VerifyOtpResponse>("/auth/email/verify-otp", { email, otp });
}

export async function sendPhoneOtp(phone: string): Promise<SendOtpResponse> {
  return await postJson<SendOtpResponse>("/auth/phone/send-otp", { phone });
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  return await postJson<VerifyOtpResponse>("/auth/phone/verify-otp", { phone, otp });
}
