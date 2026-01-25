import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult } from "../types";
import { heuristicAnalyze } from "./scamHeuristics";

const ENV_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
const ENV_MODEL = (import.meta as any).env?.VITE_GEMINI_MODEL as string | undefined;

function getApiKey(): string {
  // Vite build-time env
  const fromEnv = (ENV_KEY || "").trim();
  if (fromEnv && !fromEnv.includes("PASTE_YOUR")) return fromEnv;

  // Runtime override (useful on Android builds / demos)
  const fromStorage = (localStorage.getItem("cs_gemini_key") || "").trim();
  return fromStorage;
}

function getModel(): string {
  return (ENV_MODEL || localStorage.getItem("cs_gemini_model") || "gemini-3-flash-preview").trim();
}

function getClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }
  return new GoogleGenAI({ apiKey });
}

export function hasGeminiKey(): boolean {
  return !!getApiKey();
}

/**
 * Primary scanner.
 * - Uses Gemini if a key is present
 * - Falls back to offline heuristics if Gemini fails or key is missing
 */
export async function analyzeContent(content: string): Promise<ScanResult> {
  const trimmed = (content || "").trim();
  if (!trimmed) return heuristicAnalyze("");

  // Quick offline pass first (cheap). If it's clearly safe, we can return immediately.
  const fast = heuristicAnalyze(trimmed);
  const likelySafe = !fast.isScam && fast.riskScore < 25;
  if (likelySafe && !hasGeminiKey()) return fast;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: `
SYSTEM: You are CampusShield AI, a professional digital security assistant.
TASK: Analyze the content for scams (phishing, fake jobs, fraudulent links, impersonation).
CONTEXT: The content might be a message from WhatsApp, Telegram, SMS, Email, or Browser.
STYLE: Simple, direct, non-technical language.

USER CONTENT: "${trimmed}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isScam: { type: Type.BOOLEAN },
            riskScore: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            detectedPatterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            scamType: { type: Type.STRING },
          },
          required: ["isScam", "riskScore", "explanation", "recommendations", "detectedPatterns"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    // Minimal sanity: merge with heuristic signals if model returns weak output
    if (typeof result?.isScam !== "boolean" || typeof result?.riskScore !== "number") {
      return fast;
    }
    return result as ScanResult;
  } catch (error) {
    console.warn("Gemini failed — falling back to heuristic.", error);
    return fast;
  }
}

export async function askAssistant(question: string): Promise<string> {
  const q = (question || "").trim();
  if (!q) return "Ask me a safety question.";
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: `You are a helpful digital safety assistant for CampusShield. Answer briefly and clearly: "${q}"`,
    });
    return response.text || "I couldn't generate a response. Try again.";
  } catch {
    return "I can't reach the safety server right now. If you're unsure, don't click links or share OTP/PIN.";
  }
}
