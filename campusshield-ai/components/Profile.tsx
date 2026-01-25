import { auth } from "../services/firebase";

import React, { useState } from 'react';
import { User } from '../types';
import { Icons } from '../constants';
import { registerSW, pushAlertNotification } from '../services/pwaNotifications';
import { sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } from '../services/verificationApi';

interface ProfileProps {
  user: User | null;
  onLogin: (phone: string, name: string, email: string, emailVerified: boolean, phoneVerified: boolean) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleElderly: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogin, onLogout, isDarkMode, onToggleElderly }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyNote, setVerifyNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [notifNote, setNotifNote] = useState<string>('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cs_gemini_key') || '');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyNote('');
    if (phone.replace(/\D/g, '').length < 10) {
      setVerifyNote('Enter a valid phone number.');
      return;
    }
    if (!name.trim()) {
      setVerifyNote('Enter your name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setVerifyNote('Enter a valid email address.');
      return;
    }

    // Require email verification (real OTP). Phone verification is recommended.
    if (!emailVerified) {
      setVerifyNote('Verify your email OTP to continue.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      onLogin(phone.trim(), name.trim(), email.trim(), emailVerified, phoneVerified);
      setLoading(false);
    }, 1500);
  };

  const handleSendEmailOtp = async () => {
    setVerifyNote('');
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setVerifyNote('Enter a valid email first.');
      return;
    }
    try {
      setLoading(true);
      const res = await sendEmailOtp(em);
      setEmailOtpSent(true);
      setEmailVerified(false);
      setVerifyNote(res.devOtp ? `OTP sent (dev): ${res.devOtp}` : 'OTP sent to your email.');
    } catch (e: any) {
      setVerifyNote(e?.message || 'Failed to send OTP. Is the verification server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setVerifyNote('');
    const em = email.trim();
    const otp = emailOtp.trim();
    if (!otp || otp.length < 4) {
      setVerifyNote('Enter the email OTP.');
      return;
    }
    try {
      setLoading(true);
      const res = await verifyEmailOtp(em, otp);
      if (res.ok) {
        setEmailVerified(true);
        setVerifyNote('Email verified ✅');
      } else {
        setVerifyNote(res.message || 'Invalid OTP.');
      }
    } catch (e: any) {
      setVerifyNote(e?.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setVerifyNote('');
    const ph = phone.trim();
    if (ph.replace(/\D/g, '').length < 10) {
      setVerifyNote('Enter a valid phone first.');
      return;
    }
    try {
      setLoading(true);
      const res = await sendPhoneOtp(ph);
      setPhoneOtpSent(true);
      setPhoneVerified(false);
      setVerifyNote(res.devOtp ? `SMS OTP sent (dev): ${res.devOtp}` : 'OTP sent to your phone.');
    } catch (e: any) {
      setVerifyNote(e?.message || 'Failed to send phone OTP (Twilio not configured?).');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setVerifyNote('');
    const ph = phone.trim();
    const otp = phoneOtp.trim();
    if (!otp || otp.length < 4) {
      setVerifyNote('Enter the phone OTP.');
      return;
    }
    try {
      setLoading(true);
      const res = await verifyPhoneOtp(ph, otp);
      if (res.ok) {
        setPhoneVerified(true);
        setVerifyNote('Phone verified ✅');
      } else {
        setVerifyNote(res.message || 'Invalid OTP.');
      }
    } catch (e: any) {
      setVerifyNote(e?.message || 'Failed to verify phone OTP.');
    } finally {
      setLoading(false);
    }
  };

  const enableNotifications = async () => {
    setNotifNote('');
    if (typeof Notification === 'undefined') {
      setNotifNote('Notifications are not supported in this environment. Use Chrome on Android / desktop.');
      return;
    }

    // Register SW first so the test notification can actually show.
    const reg = await registerSW();
    if (!reg) {
      setNotifNote(
        'Service Worker is blocked here. Open the app on https or http://localhost (Android emulator: use adb reverse + open http://localhost:5173).'
      );
      // Still request permission (some envs allow Notification API but block SW)
    }

    const perm = await Notification.requestPermission();
    setNotifStatus(perm);

    if (perm === 'granted') {
      // Fire a one-time test alert so the user knows it really works.
      const ok = await pushAlertNotification({
        title: 'CampusShield',
        body: 'Alerts enabled ✅ You will be notified when a scam is detected.',
      });
      if (!ok) {
        setNotifNote(
          'Alerts are enabled, but notifications still failed to deliver. Most common cause: not running on https/localhost, or browser restrictions.'
        );
      } else {
        setNotifNote('Alerts are enabled and working.');
      }
    }
  };

  const saveKey = () => {
    const v = apiKey.trim();
    if (!v) {
      localStorage.removeItem('cs_gemini_key');
    } else {
      localStorage.setItem('cs_gemini_key', v);
    }
  };

  const cardBg = isDarkMode ? 'bg-slate-900/80 border-slate-700 backdrop-blur-xl shadow-2xl' : 'bg-white border-slate-200 shadow-xl';
  const textMain = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSec = isDarkMode ? 'text-slate-500' : 'text-slate-400';
  const isElderly = user?.isElderlyMode;

  if (!user?.isLoggedIn) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl transition-all ${
            isDarkMode ? 'bg-zinc-800 text-white shadow-black' : 'bg-slate-900 text-white shadow-slate-300'
          }`}>
            <Icons.Shield />
          </div>
          <h2 className={`text-4xl font-black tracking-tighter ${textMain}`}>Join Shield</h2>
          <p className={`${textSec} text-sm font-medium`}>Activate your personalized security vault.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${textSec}`}>Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border rounded-[1.5rem] p-5 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500/40' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500/40'
              }`}
              required
            />
          </div>
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${textSec}`}>Secure Mobile Identity</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full border rounded-[1.5rem] p-5 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500/40' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500/40'
              }`}
              required
            />
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${textSec}`}>Email</label>
            <input
              type="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailVerified(false);
              }}
              className={`w-full border rounded-[1.5rem] p-5 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500/40' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500/40'
              }`}
              required
            />
          </div>

          {/* OTP Verification */}
          <div className={`p-5 rounded-[1.5rem] border space-y-3 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`font-black ${textMain}`}>Email Verification</p>
                <p className={`text-xs ${textSec}`}>Required to log in. OTP is sent from the local verification server.</p>
              </div>
              <button
                type="button"
                onClick={handleSendEmailOtp}
                disabled={loading}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                Send OTP
              </button>
            </div>

            {emailOtpSent && (
              <div className="flex gap-2">
                <input
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className={`flex-1 border rounded-2xl p-4 text-xs focus:outline-none ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleVerifyEmailOtp}
                  disabled={loading}
                  className={`px-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all ${
                    emailVerified ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : (isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white')
                  }`}
                >
                  {emailVerified ? 'Verified' : 'Verify'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div>
                <p className={`font-black ${textMain}`}>Phone Verification</p>
                <p className={`text-xs ${textSec}`}>Optional (needs Twilio on backend). You can still use the app without this.</p>
              </div>
              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={loading}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                Send SMS
              </button>
            </div>

            {phoneOtpSent && (
              <div className="flex gap-2">
                <input
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  placeholder="SMS OTP"
                  className={`flex-1 border rounded-2xl p-4 text-xs focus:outline-none ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleVerifyPhoneOtp}
                  disabled={loading}
                  className={`px-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all ${
                    phoneVerified ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : (isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white')
                  }`}
                >
                  {phoneVerified ? 'Verified' : 'Verify'}
                </button>
              </div>
            )}

            {verifyNote && (
              <p className={`text-xs ${textSec}`}>{verifyNote}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-6 rounded-[1.5rem] font-black text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
              isDarkMode ? 'bg-zinc-100 text-slate-950 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {loading ? <div className="w-6 h-6 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div> : 'Initialize Security'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-500 ${isElderly ? 'text-xl' : ''}`}>
      {/* Security ID Card Component */}
      <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden group transition-all duration-700 ${cardBg}`}>
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <div className="scale-[4] rotate-12"><Icons.Shield /></div>
        </div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black border-2 transition-all ${
            isDarkMode ? 'bg-slate-950 text-emerald-500 border-emerald-500/20' : 'bg-slate-900 text-white border-white/10'
          }`}>
            {user.phone.slice(-2)}
          </div>
          <div>
            <h2 className={`font-black tracking-tighter ${isElderly ? 'text-3xl' : 'text-2xl'} ${textMain}`}>{user.name}</h2>
            <p className={`mt-1 text-xs ${textSec}`}>{user.phone}{user.email ? ` • ${user.email}` : ''}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${user.emailVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
              </span>
              <span className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${user.phoneVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200')}`}>
                {user.phoneVerified ? 'Phone Verified' : 'Phone Unverified'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 relative z-10">
            <div className="space-y-1">
                <p className={`font-black uppercase tracking-widest ${isElderly ? 'text-xs' : 'text-[9px]'} ${textSec}`}>Trust Score</p>
                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.trustScore}</span>
                    <span className="text-emerald-500 text-sm font-bold">/100</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${user.trustScore}%` }}></div>
                </div>
            </div>
            <div className="space-y-1 text-right">
                <p className={`font-black uppercase tracking-widest ${isElderly ? 'text-xs' : 'text-[9px]'} ${textSec}`}>Security Tier</p>
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}>Shield Elite</span>
            </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Notifications */}
        <div className={`p-6 rounded-[2rem] border space-y-4 transition-all ${cardBg}`}>
          <h3 className={`font-black uppercase tracking-[0.2em] ${isElderly ? 'text-lg text-emerald-500' : 'text-[10px] text-slate-500'}`}>Notifications</h3>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`font-black ${textMain}`}>Allow Alerts</p>
              <p className={`text-xs ${textSec}`}>Get notified when a scam is intercepted.</p>
            </div>
            <button
              onClick={enableNotifications}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                notifStatus === 'granted'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : (isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-900 text-white')
              }`}
            >
              {notifStatus === 'granted' ? 'Enabled' : 'Enable'}
            </button>
          </div>
          {notifStatus === 'denied' && (
            <p className={`text-xs ${textSec}`}>Notifications are blocked. Enable them in your browser/app settings.</p>
          )}
          {notifNote && (
            <p className={`text-xs ${textSec}`}>{notifNote}</p>
          )}
        </div>

        {/* Gemini Key */}
        <div className={`p-6 rounded-[2rem] border space-y-4 transition-all ${cardBg}`}>
          <h3 className={`font-black uppercase tracking-[0.2em] ${isElderly ? 'text-lg text-emerald-500' : 'text-[10px] text-slate-500'}`}>Gemini API Key</h3>
          <p className={`text-xs ${textSec}`}>
            If you don’t want to rebuild with a .env file, you can paste your Gemini key here (stored locally on this device).
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className={`w-full border rounded-2xl p-4 text-xs focus:outline-none ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          />
          <div className="flex gap-2">
            <button
              onClick={saveKey}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
              }`}
            >
              Save
            </button>
            <button
              onClick={() => {
                setApiKey('');
                localStorage.removeItem('cs_gemini_key');
              }}
              className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900'
              }`}
            >
              Clear
            </button>
          </div>
        </div>

        <div className={`p-6 rounded-[2rem] border space-y-6 transition-all ${cardBg}`}>
            <h3 className={`font-black uppercase tracking-[0.2em] ${isElderly ? 'text-lg text-emerald-500' : 'text-[10px] text-slate-500'}`}>Mode Settings</h3>
            
            {/* Elderly Mode Toggle */}
            <button 
                onClick={onToggleElderly}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                    isElderly ? 'bg-emerald-500/10 border-emerald-500/30 border' : (isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')
                }`}
            >
                <div className="text-left">
                    <p className={`font-black ${isElderly ? 'text-xl' : 'text-sm'} ${textMain}`}>Simple Mode</p>
                    <p className={`text-xs ${textSec}`}>Bigger buttons & text for easier use.</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isElderly ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isElderly ? 'right-1 bg-white' : 'left-1 bg-slate-400'}`}></div>
                </div>
            </button>
        </div>

        <button
            onClick={onLogout}
            className={`w-full text-xs font-black uppercase tracking-widest py-6 transition-colors ${
            isDarkMode ? 'text-slate-600 hover:text-red-500' : 'text-slate-400 hover:text-red-600'
            }`}
        >
            Terminate Session
        </button>
      </div>
    </div>
  );
};

export default Profile;
