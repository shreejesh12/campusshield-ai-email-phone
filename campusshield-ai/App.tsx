
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Scanner from './components/Scanner';
import History from './components/History';
import Profile from './components/Profile';
import ElderlySafety from './components/ElderlySafety';
import { AppTab, HistoryItem, User } from './types';
import { Icons } from './constants';
import { analyzeContent, askAssistant } from './services/geminiService';
import { setGuardianStatusNotification, pushAlertNotification } from './services/pwaNotifications';
import { load, save, remove } from './services/storage';
import { getSimulatedMessage } from './services/messageSimulator';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [protectionLog, setProtectionLog] = useState<string[]>(["System initialized...", "Scanning encryption layers..."]);
  const [incomingAlert, setIncomingAlert] = useState<HistoryItem | null>(null);

  // Assistant State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMsg, setAssistantMsg] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const interceptBusyRef = useRef(false);

  useEffect(() => {
    const savedHistory = load<HistoryItem[]>('cs_history');
    if (savedHistory) setHistory(savedHistory);
    const savedUser = load<User>('cs_user');
    if (savedUser) setUser(savedUser);
  }, []);

  const handleGuardianToggle = async () => {
    if (!isGuardianActive) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);
    }
    const next = !isGuardianActive;
    setIsGuardianActive(next);
    // Best-effort: show an ongoing notification in Android notification shade
    // (Works best when installed as PWA or in Chrome-based WebView)
    const ok = await setGuardianStatusNotification(next);
    if (next && !ok) {
      // Most common cause: not running on https/localhost, or user denied permission.
      setProtectionLog((prev) => [
        "NOTIFICATIONS DISABLED: open on https/localhost and allow notifications (Android emulator: use adb reverse + http://localhost:5173).",
        ...prev.slice(0, 15),
      ]);
    }
  };

  const handleLogin = (phone: string, name: string, email: string, emailVerified: boolean, phoneVerified: boolean) => {
    const newUser: User = {
      phone,
      name,
      email,
      emailVerified,
      phoneVerified,
      isLoggedIn: true,
      trustScore: 92,
      isElderlyMode: false,
    };
    setUser(newUser);
    save('cs_user', newUser);
    setActiveTab(AppTab.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    remove('cs_user');
  };

  const handleToggleElderly = () => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isElderlyMode: !prev.isElderlyMode };
      save('cs_user', updated);
      return updated;
    });
  };

  const handleScanComplete = (item: HistoryItem) => {
    setHistory((prev) => {
      const newHistory = [...prev, item];
      save('cs_history', newHistory);
      return newHistory;
    });
  };

  const handleAskAssistant = async () => {
    if (!assistantMsg.trim()) return;
    setIsTyping(true);
    try {
        const res = await askAssistant(assistantMsg);
        setAssistantResponse(res);
        setAssistantMsg("");
    } catch (e) {
        setAssistantResponse("I'm having trouble connecting to the safety server.");
    } finally {
        setIsTyping(false);
    }
  };

  const runSimulatedIntercept = async () => {
    if (interceptBusyRef.current) return;
    interceptBusyRef.current = true;
    try {
      const msg = getSimulatedMessage();
      setProtectionLog((prev) => [
        `INCOMING ${msg.channel} message detected... analyzing.`,
        ...prev.slice(0, 15),
      ]);

      const res = await analyzeContent(msg.text);
      const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const item: HistoryItem = {
        id,
        timestamp: Date.now(),
        content: `[${msg.channel}] ${msg.text}`,
        result: res,
      };

      // Always store intercepts so the user can open "Messages/History" and see which are scams.
      handleScanComplete(item);

      if (res.isScam || res.riskScore >= 65) {
        setIncomingAlert(item);
        setProtectionLog((prev) => [
          `ALERT: ${res.scamType || 'Suspicious'} blocked (${Math.round(res.riskScore)}/100)`,
          ...prev.slice(0, 15),
        ]);

        pushAlertNotification({
          title: 'CampusShield Alert',
          body: `${res.scamType || 'Suspicious message'} (${Math.round(res.riskScore)}/100)`,
          riskScore: res.riskScore,
          content: item.content,
        });
      } else {
        setProtectionLog((prev) => [
          `CLEAN: ${msg.channel} message appears safe.`,
          ...prev.slice(0, 15),
        ]);
      }
    } finally {
      interceptBusyRef.current = false;
    }
  };

  // Background simulation logic + simulated message intercept
  useEffect(() => {
    let interval: any;
    if (isGuardianActive) {
      interval = setInterval(async () => {
        // 1) Log some background noise (UI feels alive)
        const random = Math.random();
        if (random > 0.55) {
          const channels = ["WhatsApp", "Telegram", "SMS", "Email", "Browser"];
          const channel = channels[Math.floor(Math.random() * channels.length)];
          const actions = ["scanning", "verifying", "cleaning", "routing"];
          const action = actions[Math.floor(Math.random() * actions.length)];
          setProtectionLog(prev => [
            `${action.toUpperCase()} ${channel} traffic... Secure.`,
            ...prev.slice(0, 15)
          ]);
        }

        // 2) Simulate an incoming message sometimes
        if (Math.random() < 0.25) runSimulatedIntercept();
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isGuardianActive]);

  const renderContent = () => {
    const isElderly = user?.isElderlyMode;
    const cardBg = isDarkMode ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200 shadow-sm';
    const textMain = isDarkMode ? 'text-slate-100' : 'text-slate-900';
    const textSec = isDarkMode ? 'text-slate-500' : 'text-slate-400';

    switch (activeTab) {
      case AppTab.DASHBOARD:
        return (
          <div className="p-4 space-y-6 animate-in fade-in duration-700 relative z-10">
            {/* Guardian Pulsing Button Area */}
            <div className="flex flex-col items-center justify-center py-12 relative">
                {/* Flash Effect */}
                {showFlash && (
                    <div className="absolute w-24 h-24 rounded-full bg-white shield-flash-effect z-20"></div>
                )}

                {/* Pulsing Rings */}
                {isGuardianActive && (
                    <>
                    <div className="absolute w-52 h-52 rounded-full border border-emerald-500/40 animate-ping"></div>
                    <div className="absolute w-64 h-64 rounded-full border border-emerald-500/20 custom-pulse-ring"></div>
                    <div className="absolute w-80 h-80 rounded-full border border-emerald-500/5 animate-[pulse_4s_infinite]"></div>
                    </>
                )}

                <button 
                    onClick={handleGuardianToggle}
                    className={`w-48 h-48 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-700 shadow-2xl z-10 relative overflow-hidden active:scale-90 ${
                    isGuardianActive 
                        ? 'bg-emerald-500 text-white shadow-emerald-500/40 scale-105' 
                        : (isDarkMode ? 'bg-slate-900 border-2 border-slate-800 text-slate-500' : 'bg-white border-2 border-slate-200 text-slate-400')
                    }`}
                >
                    <div className={`transition-all duration-700 transform ${isGuardianActive ? 'rotate-[360deg] scale-125' : ''}`}>
                        <Icons.Shield />
                    </div>
                    <span className={`font-black uppercase tracking-[0.2em] relative z-10 transition-all duration-500 ${isElderly ? 'text-lg' : 'text-[10px]'}`}>
                        {isGuardianActive ? 'SECURED' : 'OFFLINE'}
                    </span>
                </button>
            </div>

            <div className="text-center space-y-1 relative z-10 transition-all duration-1000">
                <h2 className={`font-black transition-colors duration-1000 ${isElderly ? 'text-3xl' : 'text-2xl'} ${isGuardianActive ? 'text-emerald-500' : textMain}`}>
                  {isGuardianActive ? 'Guardian Protocol Active' : 'System Standby'}
                </h2>
                <p className={`font-medium transition-colors duration-1000 ${isElderly ? 'text-base' : 'text-xs'} ${isGuardianActive ? 'text-emerald-500/60' : textSec}`}>
                  {isGuardianActive ? 'AI Intercepting scams in real-time' : 'Tap shield to activate background protection'}
                </p>
            </div>

            {isGuardianActive && (
              <div className="flex justify-center">
                <button
                  onClick={() => runSimulatedIntercept()}
                  className={`mt-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Test Incoming Message
                </button>
              </div>
            )}

            {/* Latest Intercepted Alert */}
            {incomingAlert && (
              <div
                className={`p-5 rounded-[2rem] border transition-all duration-500 glass ${cardBg} ${incomingAlert.result.isScam ? 'border-red-500/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`font-black ${isElderly ? 'text-xl' : 'text-sm'} ${incomingAlert.result.isScam ? 'text-red-400' : textMain}`}>
                      {incomingAlert.result.isScam ? '⚠ Scam intercepted' : 'Message analyzed'}
                    </p>
                    <p className={`text-xs mt-1 ${textSec} line-clamp-2`}>{incomingAlert.content}</p>
                    <p className={`text-xs mt-2 ${incomingAlert.result.isScam ? 'text-red-300/80' : textSec}`}>
                      Risk: {Math.round(incomingAlert.result.riskScore)}/100 • {incomingAlert.result.scamType || 'Analysis'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setActiveTab(AppTab.HISTORY)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                        isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-900 text-white'
                      }`}
                    >
                      View
                    </button>
                    <button
                      onClick={() => setIncomingAlert(null)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                        isDarkMode ? 'bg-slate-900 text-slate-400 border border-slate-800' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Neural Log Feed */}
            <div className={`p-6 rounded-[2.5rem] border h-44 overflow-hidden relative group transition-all duration-700 glass ${cardBg}`}>
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full transition-colors duration-500 ${isGuardianActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                        <h3 className={`font-black uppercase tracking-widest ${isElderly ? 'text-sm' : 'text-[10px]'} ${isGuardianActive ? 'text-emerald-500' : textSec}`}>
                            Neural Intercept Log
                        </h3>
                    </div>
                    {isGuardianActive && <span className="mono text-[8px] font-black text-emerald-500 animate-pulse">LIVE</span>}
                </div>
                <div className="space-y-2.5 font-mono text-[10px] opacity-80 overflow-y-auto h-full pr-2 custom-scrollbar">
                    {protectionLog.map((log, idx) => (
                        <div key={idx} className="animate-in slide-in-from-left-4 fade-in duration-500 flex gap-2 text-slate-400">
                            <span className="opacity-40">[{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false})}]</span>
                            <span className="truncate">{log}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <StatCard label="Protected" value={history.length} isDarkMode={isDarkMode} isActive={isGuardianActive} isElderly={isElderly} />
              <StatCard label="Trust Score" value={user?.trustScore || 85} color="text-emerald-400" isDarkMode={isDarkMode} isActive={isGuardianActive} isElderly={isElderly} />
            </div>

            {/* Grid Pattern Background */}
            <div className={`fixed inset-0 grid-pattern pointer-events-none transition-all duration-1000 -z-10 ${isGuardianActive ? 'opacity-100 animate-grid' : 'opacity-0'}`}></div>
          </div>
        );
      case AppTab.SCAN:
        return <Scanner onScanComplete={handleScanComplete} isDarkMode={isDarkMode} isElderly={isElderly} />;
      case AppTab.HISTORY:
        return <History history={history} isDarkMode={isDarkMode} isElderly={isElderly} />;
      case AppTab.PROFILE:
        return <Profile user={user} onLogin={handleLogin} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleElderly={handleToggleElderly} />;
      case AppTab.SAFETY_CENTER:
        return <ElderlySafety isDarkMode={isDarkMode} isElderly={isElderly} onScanComplete={handleScanComplete} />;
      default:
        return null;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isDarkMode={isDarkMode} 
      toggleTheme={() => setIsDarkMode(!isDarkMode)} 
      isGuardianActive={isGuardianActive}
      isElderly={user?.isElderlyMode}
    >
      {incomingAlert && incomingAlert.result.isScam && (
        <div className="fixed left-4 right-4 z-50 animate-in slide-in-from-top-10 duration-500" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 5.5rem)' }}>
            <div className="bg-red-600 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-red-500/50">
                <div className="bg-white/20 p-3 rounded-2xl animate-pulse">
                    <Icons.Alert />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black uppercase tracking-widest">Intercepted Scam!</h4>
                    <p className="text-[10px] opacity-90 truncate leading-tight mt-1">Blocked message: {incomingAlert.content}</p>
                </div>
                <button onClick={() => setIncomingAlert(null)} className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-4 py-2 rounded-xl active:scale-90 transition-all">Dismiss</button>
            </div>
        </div>
      )}

      {/* Assistant FAB */}
      <div className="fixed bottom-32 right-6 z-50">
        <button 
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className={`w-16 h-16 rounded-[1.5rem] shadow-2xl flex items-center justify-center transition-all duration-500 active:scale-90 ${
                isAssistantOpen 
                ? 'bg-red-500 text-white rotate-[135deg]' 
                : (isGuardianActive 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/40 animate-bounce' 
                    : (isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'))
            }`}
        >
            <Icons.Search />
        </button>
        {isAssistantOpen && (
            <div className={`absolute bottom-20 right-0 w-80 p-5 border rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] animate-in zoom-in-95 origin-bottom-right transition-all duration-300 ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Safety Assistant</h4>
                </div>
                <div className="max-h-64 overflow-y-auto mb-4 space-y-3 pr-2 custom-scrollbar">
                    {assistantResponse ? (
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed animate-in slide-in-from-bottom-4 duration-500 shadow-inner ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            {assistantResponse}
                        </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic font-medium">I'm scanning for scams 24/7. Ask me anything!</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <input 
                        value={assistantMsg}
                        onChange={(e) => setAssistantMsg(e.target.value)}
                        placeholder="Ask me anything..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAssistant()}
                        className={`flex-1 text-xs p-4 rounded-2xl focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-transparent focus:bg-slate-700' : 'bg-slate-100 border-transparent focus:bg-slate-200'}`}
                    />
                    <button 
                        onClick={handleAskAssistant}
                        disabled={isTyping}
                        className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center ${isDarkMode ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                        {isTyping ? <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin"></div> : <Icons.Search />}
                    </button>
                </div>
            </div>
        )}
      </div>

      {renderContent()}
    </Layout>
  );
};

const StatCard = ({ label, value, color, isDarkMode, isActive, isElderly }: { label: string, value: number | string, color?: string, isDarkMode: boolean, isActive?: boolean, isElderly?: boolean }) => (
  <div className={`p-6 rounded-[2.5rem] border flex flex-col items-center justify-center space-y-1 transition-all duration-700 glass ${
    isDarkMode ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200 shadow-sm'
  } ${isActive ? (isDarkMode ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)] scale-105' : 'border-emerald-500/40') : ''}`}>
    <span className={`${isElderly ? 'text-5xl' : 'text-4xl'} font-black transition-all duration-700 ${color || (isActive ? 'text-white' : (isDarkMode ? 'text-white' : 'text-slate-900'))}`}>{value}</span>
    <span className={`${isElderly ? 'text-sm' : 'text-[10px]'} font-black uppercase tracking-widest transition-all duration-700 ${isActive ? 'text-emerald-500/60' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>{label}</span>
  </div>
);

export default App;
