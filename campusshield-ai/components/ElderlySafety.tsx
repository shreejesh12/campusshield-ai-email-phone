import React, { useMemo, useState } from 'react';
import { analyzeContent } from '../services/geminiService';
import { pushAlertNotification } from '../services/pwaNotifications';
import { HistoryItem, ScanResult } from '../types';

function newId(): string {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isSuspiciousFrom(from: string): boolean {
  const f = (from || '').toLowerCase();
  // Very rough heuristics — just a nudge, not a verdict.
  return /@gmail\.com|@yahoo\.com|@outlook\.com|@hotmail\.com/.test(f) || /\.ru\b|\.xyz\b|\.top\b|\.work\b/.test(f);
}

function scorePhoneRisk(phone: string): { risk: number; reasons: string[] } {
  const p = (phone || '').trim();
  const digits = p.replace(/\D/g, '');
  const reasons: string[] = [];
  let risk = 10;

  if (digits.length < 10) {
    risk += 35;
    reasons.push('Too few digits');
  }
  if (/^(\+?0+|000)/.test(p)) {
    risk += 25;
    reasons.push('Invalid prefix');
  }
  if (!/^\+?\d[\d\s\-()]{8,}$/.test(p)) {
    risk += 20;
    reasons.push('Strange format');
  }
  if (/\d{6,}/.test(p) && /(.)\1{4,}/.test(p.replace(/\D/g, ''))) {
    risk += 15;
    reasons.push('Repeated digits');
  }

  risk = Math.max(0, Math.min(100, risk));
  return { risk, reasons };
}

const MiniResult: React.FC<{ result: ScanResult; isDarkMode: boolean }> = ({ result, isDarkMode }) => {
  const badge = result.isScam ? 'SCAM' : (result.riskScore >= 45 ? 'SUSPICIOUS' : 'SAFE');
  const badgeClass = result.isScam
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : result.riskScore >= 45
      ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
      : (isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30');

  return (
    <div className={`mt-3 p-5 rounded-[1.75rem] border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${badgeClass}`}>{badge}</div>
          <div className={`mt-2 text-2xl font-black ${result.isScam ? 'text-red-400' : (result.riskScore >= 45 ? 'text-orange-400' : 'text-emerald-400')}`}>
            {Math.round(result.riskScore)}/100
          </div>
        </div>
        <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{result.scamType || 'Analysis'}</div>
      </div>
      <p className={`mt-3 text-sm leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{result.explanation}</p>
      {result.recommendations?.length ? (
        <ul className={`mt-3 text-sm list-disc list-inside ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {result.recommendations.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      ) : null}
    </div>
  );
};

const ElderlySafety: React.FC<{
  isDarkMode: boolean;
  isElderly?: boolean;
  onScanComplete?: (item: HistoryItem) => void;
}> = ({ isDarkMode, isElderly = false, onScanComplete }) => {
  const tips = useMemo(() => ([
    {
      title: "Grandparent Scam",
      desc: "Someone calls pretending to be your grandchild needing money for an emergency. Hang up and call them directly.",
      icon: "👵"
    },
    {
      title: "Bank Text Messages",
      desc: "Banks never ask for passwords/OTP over text. If unsure, open the official app or call the bank number you already know.",
      icon: "🏦"
    },
    {
      title: "Free Gifts & Prizes",
      desc: "If you win a prize for a contest you never joined, it’s almost always a trick to get your details.",
      icon: "🎁"
    }
  ]), []);

  const [emailFrom, setEmailFrom] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailRes, setEmailRes] = useState<ScanResult | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneContext, setPhoneContext] = useState('');
  const [phoneRes, setPhoneRes] = useState<ScanResult | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const textMain = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSec = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const scanEmail = async () => {
    const content = `EMAIL\nFROM: ${emailFrom}\nSUBJECT: ${emailSubject}\n\n${emailBody}`.trim();
    if (!emailBody.trim() && !emailSubject.trim() && !emailFrom.trim()) return;
    setEmailLoading(true);
    try {
      const res = await analyzeContent(content);
      // small heuristic bump for suspicious sender domains
      const bump = isSuspiciousFrom(emailFrom) ? 10 : 0;
      const bumped: ScanResult = {
        ...res,
        riskScore: Math.max(0, Math.min(100, (res.riskScore || 0) + bump)),
        isScam: res.isScam || (res.riskScore + bump >= 70),
      };
      setEmailRes(bumped);

      const item: HistoryItem = { id: newId(), timestamp: Date.now(), content, result: bumped };
      onScanComplete?.(item);

      if (bumped.isScam || bumped.riskScore >= 70) {
        await pushAlertNotification({
          title: 'CampusShield Email Alert',
          body: `${bumped.scamType || 'Suspicious email'} (${Math.round(bumped.riskScore)}/100)`,
          riskScore: bumped.riskScore,
          content,
        });
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const scanPhone = async () => {
    const base = scorePhoneRisk(phoneNumber);
    const content = `PHONE CHECK\nNUMBER: ${phoneNumber}\n\nCONTEXT: ${phoneContext}`.trim();
    if (!phoneNumber.trim() && !phoneContext.trim()) return;

    setPhoneLoading(true);
    try {
      const res = await analyzeContent(content);
      // blend in local phone-risk score (prevents "0%" on obviously weird formats)
      const blendedRisk = Math.round(Math.max(res.riskScore, base.risk));
      const blended: ScanResult = {
        ...res,
        riskScore: blendedRisk,
        isScam: res.isScam || blendedRisk >= 70,
        detectedPatterns: Array.from(new Set([...(res.detectedPatterns || []), ...base.reasons.map(r => `Phone: ${r}`)])),
      };
      setPhoneRes(blended);

      const item: HistoryItem = { id: newId(), timestamp: Date.now(), content, result: blended };
      onScanComplete?.(item);

      if (blended.isScam || blended.riskScore >= 70) {
        await pushAlertNotification({
          title: 'CampusShield Number Alert',
          body: `${blended.scamType || 'Suspicious number'} (${Math.round(blended.riskScore)}/100)`,
          riskScore: blended.riskScore,
          content,
        });
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className={`p-6 space-y-6 animate-in fade-in duration-500 ${isElderly ? 'text-lg' : ''}`}>
      <div className="space-y-2">
        <h2 className={`font-black ${isElderly ? 'text-4xl' : 'text-3xl'} ${textMain}`}>Safety Center</h2>
        <p className={`${textSec} ${isElderly ? 'text-base' : 'text-sm'} font-medium`}>Check emails & phone numbers, plus common scam patterns.</p>
      </div>

      {/* Email Guard */}
      <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className={`font-black ${isElderly ? 'text-2xl' : 'text-xl'} ${textMain}`}>Email Guard</h3>
            <p className={`${textSec} text-sm font-medium`}>Paste the email details and scan instantly.</p>
          </div>
          <button
            onClick={scanEmail}
            disabled={emailLoading}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${
              isDarkMode ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-white'
            }`}
          >
            {emailLoading ? 'Scanning...' : 'Scan Email'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder="From (example: admin@university.edu)"
            className={`w-full border rounded-2xl p-4 text-sm focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
          />
          <input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Subject"
            className={`w-full border rounded-2xl p-4 text-sm focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
          />
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Paste the email body here..."
            className={`w-full h-32 border rounded-2xl p-4 text-sm focus:outline-none resize-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
          />
        </div>

        {emailRes && <MiniResult result={emailRes} isDarkMode={isDarkMode} />}
      </div>

      {/* Phone Guard */}
      <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className={`font-black ${isElderly ? 'text-2xl' : 'text-xl'} ${textMain}`}>Number Guard</h3>
            <p className={`${textSec} text-sm font-medium`}>Check if a phone number/message looks risky.</p>
          </div>
          <button
            onClick={scanPhone}
            disabled={phoneLoading}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${
              isDarkMode ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-white'
            }`}
          >
            {phoneLoading ? 'Scanning...' : 'Scan Number'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Phone number (example: +91 9876543210)"
            className={`w-full border rounded-2xl p-4 text-sm focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
          />
          <textarea
            value={phoneContext}
            onChange={(e) => setPhoneContext(e.target.value)}
            placeholder="Optional: what they said / SMS text / why it feels suspicious"
            className={`w-full h-24 border rounded-2xl p-4 text-sm focus:outline-none resize-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
          />
        </div>

        {phoneRes && <MiniResult result={phoneRes} isDarkMode={isDarkMode} />}
      </div>

      {/* Tips */}
      <div className="space-y-4">
        {tips.map((tip, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border flex gap-5 transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
          }`}>
            <div className="text-4xl shrink-0">{tip.icon}</div>
            <div className="space-y-2">
              <h3 className={`font-black ${isElderly ? 'text-2xl' : 'text-xl'} ${isDarkMode ? 'text-emerald-500' : 'text-slate-900'}`}>{tip.title}</h3>
              <p className={`leading-relaxed font-medium ${isElderly ? 'text-base' : 'text-sm'} ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-8 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 ${
        isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
      }`}>
        <p className={`font-bold ${isElderly ? 'text-xl' : 'text-lg'} ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>If you’re unsure: don’t click links, don’t share OTP/PIN.</p>
        <button className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
          Call a Family Member
        </button>
      </div>
    </div>
  );
};

export default ElderlySafety;
